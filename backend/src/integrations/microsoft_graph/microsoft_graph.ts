import { z } from 'zod';
import { randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env.js';
import { Integration, type IntegrationAccount, type OAuthTokens } from '../../lib/Integration.js';
import { codedError } from '../../lib/utils.js';

export type MicrosoftCredentials = {
  clientId: string;
  tenantId: string;
  clientSecret: string;
};

const meSchema = z.object({
  id: z.string().min(1),
  mail: z.string().nullish(),
  userPrincipalName: z.string().min(1),
});

const notificationSchema = z.object({
  subscriptionId: z.uuid(),
  clientState: z.string().length(64),
  changeType: z.string(),
  resourceData: z.object({ id: z.string().min(1) }),
});

export function parseNotifications(body: unknown) {
  const batch = z.object({ value: z.array(z.unknown()) }).safeParse(body);
  return batch.success ? batch.data.value.flatMap((item) => {
    const result = notificationSchema.safeParse(item);
    return result.success ? [result.data] : [];
  }) : undefined;
}

export function matchesClientState(providerData: unknown, received: string) {
  const result = z.object({ clientState: z.string().regex(/^[0-9a-f]{64}$/) }).safeParse(providerData);
  return result.success && /^[0-9a-f]{64}$/.test(received) &&
    timingSafeEqual(Buffer.from(result.data.clientState, 'hex'), Buffer.from(received, 'hex'));
}

export default class MicrosoftGraph extends Integration<MicrosoftCredentials> {
  readonly supportsPkce = true;

  async createChangeSubscription(
    userId: string,
    options: { resource: string; changeType: string; expirationDateTime: string },
    headers: Record<string, string> = {},
  ) {
    const notificationUrl = URL.parse(env.webhookBaseUrl ?? '');
    if (notificationUrl?.protocol !== 'https:') {
      throw codedError('WEBHOOK_CONFIGURATION_INVALID', 'WEBHOOK_BASE_URL must be a public HTTPS base URL.');
    }
    const clientState = randomBytes(32).toString('hex');
    const accessToken = await this.getAccessToken(userId);
    const subscription = await this.requestJson('subscriptions', accessToken, {
      ...options,
      notificationUrl: new URL('/api/webhooks/microsoft_graph', notificationUrl).href,
      clientState,
    }, headers);
    const parsed = z.object({ id: z.uuid(), expirationDateTime: z.iso.datetime({ offset: true }) }).safeParse(subscription);
    if (!parsed.success) throw codedError('EXTERNAL_SERVICE_FAILED', 'Microsoft Graph returned an invalid subscription.');
    return {
      providerSubscriptionId: parsed.data.id,
      expiry: new Date(parsed.data.expirationDateTime),
      providerData: { clientState },
    };
  }

  async requestJson(path: string, accessToken: string, body?: object, headers: Record<string, string> = {}): Promise<unknown> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body && JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw codedError('EXTERNAL_SERVICE_FAILED', `Microsoft Graph request returned ${response.status}.`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw codedError('EXTERNAL_SERVICE_TIMEOUT', 'Microsoft Graph request timed out.');
      }
      if (error instanceof Error && 'code' in error) throw error;
      throw codedError('EXTERNAL_SERVICE_FAILED', 'Microsoft Graph request failed.');
    }
  }

  protected readonly credentialsSchema: z.ZodType<MicrosoftCredentials> = z.object({
    clientId: z.string().min(1),
    tenantId: z.string().min(1),
    clientSecret: z.string().min(1),
  });

  protected getAuthEndpoint(): string {
    const { tenantId } = this.getCredentials();

    return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;
  }

  protected getScopes(): string[] {
    return ['openid', 'profile', 'email', 'offline_access', 'User.Read', 'Mail.ReadWrite', 'Mail.Send', 'Files.ReadWrite'];
  }

  protected getTokenEndpoint(): string {
    const { tenantId } = this.getCredentials();

    return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  }

  protected async requestTokenRefresh(refreshToken: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = this.getCredentials();
    const response = await fetch(this.getTokenEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = z.object({ error: z.string() }).safeParse(body);
      if (error.success && ['invalid_grant', 'interaction_required', 'consent_required', 'login_required'].includes(error.data.error)) {
        throw codedError('OAUTH_REAUTH_REQUIRED', 'Reconnect Microsoft to authorize access again.');
      }
      throw codedError('OAUTH_TOKEN_REFRESH_FAILED', `Microsoft token refresh returned ${response.status}.`);
    }
    return this.parseTokenResponse(body);
  }

  protected async getAccount(accessToken: string): Promise<IntegrationAccount> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw codedError('OAUTH_ACCOUNT_LOOKUP_FAILED', `Microsoft Graph /me returned ${response.status}.`);
    }

    const me = meSchema.safeParse(await response.json());

    if (!me.success) {
      throw codedError('OAUTH_ACCOUNT_LOOKUP_FAILED', 'Microsoft Graph /me returned an unexpected response.');
    }

    return { accountId: me.data.id, email: me.data.mail ?? me.data.userPrincipalName };
  }
}
