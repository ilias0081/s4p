import assert from 'node:assert/strict';
import test from 'node:test';

import { db, closeDatabase } from '../src/db/database.js';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';

// Explicit opt-in: this test uses a real connected account and calls Microsoft.
// Docker: docker exec -e GRAPH_LIVE_TEST=1 s4p-backend-1 node --import tsx --test tests/microsoftGraph.live.test.ts
// If multiple accounts exist, also provide GRAPH_ACCOUNT_ID=<user_integrations.id>.
test('trace Microsoft Graph authentication and inbox access', {
  skip: process.env.GRAPH_LIVE_TEST !== '1',
}, async (t) => {
  const secrets: string[] = [];
  const redact = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    return secrets.reduce((text, secret) => text.replaceAll(secret, '[redacted]'), value).slice(0, 1500);
  };
  const report = (label: string, data: unknown) => t.diagnostic(`${label}: ${JSON.stringify(data)}`);

  try {
    let query = db.selectFrom('s4p.user_integrations as account')
      .innerJoin('s4p.integrations as integration', 'integration.id', 'account.integration_id')
      .select('account.id').where('integration.name', '=', 'microsoft_graph');
    if (process.env.GRAPH_ACCOUNT_ID) query = query.where('account.id', '=', process.env.GRAPH_ACCOUNT_ID);
    const accounts = await query.execute();
    assert.equal(accounts.length, 1, 'Select exactly one Microsoft connection using GRAPH_ACCOUNT_ID if needed.');

    const account = await db.selectFrom('s4p.user_integrations')
      .select(['integration_id', 'access_token', 'refresh_token', 'access_token_expiry', 'needs_reauth'])
      .where('id', '=', accounts[0].id).executeTakeFirstOrThrow();
    const record = await db.selectFrom('s4p.integrations').select(['id', 'name', 'credentials'])
      .where('id', '=', account.integration_id).executeTakeFirstOrThrow();
    const integration = new MicrosoftGraph(record);
    const credentials = integration.getCredentials();
    secrets.push(credentials.clientSecret);
    if (account.access_token) secrets.push(account.access_token);
    if (account.refresh_token) secrets.push(account.refresh_token);

    const authority = ['common', 'consumers', 'organizations'].includes(credentials.tenantId)
      ? credentials.tenantId : 'specific tenant';
    report('Connection', { authority, storedExpiry: account.access_token_expiry, needsReauth: account.needs_reauth,
      hasAccessToken: !!account.access_token, hasRefreshToken: !!account.refresh_token });

    let accessToken = account.access_token;
    const expired = !account.access_token_expiry || account.access_token_expiry.getTime() <= Date.now();
    if (!accessToken || expired) {
      assert.ok(account.refresh_token, 'Access token is expired or missing, and there is no refresh token. Reconnect Microsoft.');
      const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(credentials.tenantId)}/oauth2/v2.0/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret,
          grant_type: 'refresh_token', refresh_token: account.refresh_token }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json().catch(() => null) as {
        access_token?: string; refresh_token?: string; error?: string; error_description?: string;
      } | null;
      if (body?.access_token) secrets.push(body.access_token);
      if (body?.refresh_token) secrets.push(body.refresh_token);
      report('Refresh (in memory only; database unchanged)', { status: response.status,
        error: redact(body?.error), description: redact(body?.error_description) });
      assert.ok(response.ok && body?.access_token, 'Microsoft rejected token refresh. See the sanitized refresh diagnostic.');
      accessToken = body.access_token;
    }
    assert.ok(accessToken, 'No access token available.');

    // Claims are decoded for diagnostics only, not trusted for authentication.
    let claims: Record<string, unknown> = {};
    try { claims = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString()); } catch {}
    const scopes = typeof claims.scp === 'string' ? claims.scp.split(' ') : [];
    const consumerTenant = claims.tid === '9188040d-6c67-4c5b-b112-36a304b66dad';
    report('Token metadata (unverified)', { audience: claims.aud, scopes, consumerTenant,
      personalIdentityProvider: claims.idp === 'live.com',
      expiry: typeof claims.exp === 'number' ? new Date(claims.exp * 1000).toISOString() : undefined,
      hasMailReadScope: scopes.some((scope) => ['Mail.Read', 'Mail.ReadWrite', 'Mail.ReadBasic'].includes(scope)) });

    const results: { endpoint: string; status: number }[] = [];
    let externalPrincipal = false;
    for (const endpoint of [
      'me?$select=userType,userPrincipalName',
      'me/mailFolders/inbox?$select=id',
      'me/mailFolders/inbox/messages?$top=1&$orderby=receivedDateTime%20desc&$select=id',
    ]) {
      const response = await fetch(`https://graph.microsoft.com/v1.0/${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json().catch(() => null) as {
        userType?: string; userPrincipalName?: string; value?: unknown[];
        error?: { code?: string; message?: string };
      } | null;
      results.push({ endpoint, status: response.status });
      report('Graph request', { endpoint, status: response.status, statusText: response.statusText,
        requestId: response.headers.get('request-id'), serverDate: response.headers.get('date'),
        challenge: redact(response.headers.get('www-authenticate')),
        errorCode: redact(body?.error?.code), errorMessage: redact(body?.error?.message),
        emptyOrNonJsonBody: body === null });
      if (endpoint.startsWith('me?') && response.ok) {
        externalPrincipal = body?.userPrincipalName?.includes('#EXT#') ?? false;
        report('Profile context', { userType: body?.userType, externalPrincipal });
      }
    }
    if (results[0].status === 200 && results.slice(1).every((result) => result.status === 401)) {
      report('Conclusion', { tokenAcceptedForProfile: true, mailboxRejected: true,
        likelyWrongTenantContext: externalPrincipal && !consumerTenant,
        explanation: externalPrincipal && !consumerTenant
          ? 'External account in an organizational tenant. For a personal mailbox, enable personal accounts, use common/consumers, and reconnect.'
          : 'Profile authentication works. Check mailbox provisioning and tenant access policies; status alone does not identify the exact cause.' });
    }
    assert.equal(results.at(-1)?.status, 200, 'Inbox request failed. See the diagnostics above; secrets and message contents were omitted.');
  } finally {
    await closeDatabase();
  }
});
