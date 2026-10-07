import { createHash, randomBytes } from 'node:crypto';

import { z } from 'zod';

import { codedError } from './utils.js';

const EXPIRY_BUFFER_SECONDS = 2 * 60;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.coerce.number(),
});

export function createCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function toCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

export type IntegrationRecord = {
  id: string;
  name: string;
  credentials: string | null;
};

export type PendingOAuth = {
  integrationId: string;
  redirectUri: string;
  codeVerifier?: string;
};

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
};

export type IntegrationAccount = {
  accountId: string;
  email: string;
};

export abstract class Integration<
  TCredentials extends { clientId: string; clientSecret: string } = { clientId: string; clientSecret: string },
> {
  protected readonly record: IntegrationRecord;

  protected abstract readonly credentialsSchema: z.ZodType<TCredentials>;

  readonly supportsPkce: boolean = false;

  constructor(record: IntegrationRecord) {
    this.record = record;
  }

  protected abstract getAuthEndpoint(): string;

  protected abstract getScopes(): string[];

  protected abstract getTokenEndpoint(): string;

  protected abstract getAccount(accessToken: string): Promise<IntegrationAccount>;

  // credentials is raw JSON for now; it will be stored encrypted in the db later
  getCredentials(): TCredentials {
    const misconfigured = () =>
      codedError('INTEGRATION_MISCONFIGURED', `Integration ${this.record.name} has missing or invalid credentials.`);

    if (!this.record.credentials) {
      throw misconfigured();
    }

    let raw: unknown;

    try {
      raw = JSON.parse(this.record.credentials);
    } catch {
      throw misconfigured();
    }

    const parsed = this.credentialsSchema.safeParse(raw);

    if (!parsed.success) {
      throw misconfigured();
    }

    return parsed.data;
  }

  getAuthUrl(redirectUri: string, codeVerifier?: string): string {
    const params = new URLSearchParams({
      client_id: this.getCredentials().clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: this.getScopes().join(' '),
    });

    if (codeVerifier) {
      params.set('code_challenge', toCodeChallenge(codeVerifier));
      params.set('code_challenge_method', 'S256');
    }

    return `${this.getAuthEndpoint()}?${params.toString()}`;
  }

  // the verifier only exists in the session when this flow used PKCE
  getCodeExchangeParams(code: string, codeVerifier?: string): Record<string, string> {
    return codeVerifier ? { code, code_verifier: codeVerifier } : { code };
  }

  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = this.getCredentials();
    const response = await fetch(this.getTokenEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        ...this.getCodeExchangeParams(code, codeVerifier),
      }),
    });

    if (!response.ok) {
      console.error(`Token exchange failed for ${this.record.name}:`, response.status, await response.text());
      throw codedError('OAUTH_TOKEN_EXCHANGE_FAILED', 'The provider rejected the authorization code.');
    }

    const parsed = tokenResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw codedError('OAUTH_TOKEN_EXCHANGE_FAILED', 'The provider returned an unexpected token response.');
    }

    const { access_token, refresh_token, expires_in } = parsed.data;

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      // Date.now() is UTC epoch milliseconds, so no timezone handling is needed
      expiresAt: new Date(Date.now() + (expires_in - EXPIRY_BUFFER_SECONDS) * 1000),
    };
  }

  async completeOAuth(code: string, redirectUri: string, codeVerifier?: string) {
    const tokens = await this.exchangeCode(code, redirectUri, codeVerifier);
    const account = await this.getAccount(tokens.accessToken);

    return { tokens, account };
  }
}