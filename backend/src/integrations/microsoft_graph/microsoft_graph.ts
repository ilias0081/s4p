import { z } from 'zod';

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

export default class MicrosoftGraph extends Integration<MicrosoftCredentials> {
  readonly supportsPkce = true;

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
    return ['openid', 'profile', 'email', 'offline_access', 'User.Read', 'Mail.ReadWrite', 'Files.ReadWrite'];
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
      throw codedError('UI_ERROR', `Unable to refresh Microsoft access (Microsoft returned ${response.status}).`);
    }
    return this.parseTokenResponse(body);
  }

  protected async getAccount(accessToken: string): Promise<IntegrationAccount> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${accessToken}` },
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
