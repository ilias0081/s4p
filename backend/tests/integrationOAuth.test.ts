import assert from 'node:assert/strict';
import test from 'node:test';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';

test('OAuth completion reports token/profile failures and completes only after loading the profile', async (t) => {
  const integration = new MicrosoftGraph({ id: 'fixture', name: 'microsoft_graph',
    credentials: JSON.stringify({ clientId: 'test-client', clientSecret: 'test-secret', tenantId: 'common' }) });
  const redirectUri = 'http://localhost:4173/integration_oauth_callback';
  const tokenResponse = () => Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    if (url.endsWith('/token')) {
      const body = options.body as URLSearchParams;
      assert.equal(body.get('grant_type'), 'authorization_code');
      assert.equal(body.get('code_verifier'), 'test-verifier');
      assert.equal(body.get('redirect_uri'), redirectUri);
      assert.ok(options.signal);
      return tokenResponse();
    }
    assert.deepEqual(options.headers, { Authorization: 'Bearer test-access' });
    assert.ok(options.signal);
    return new Response(null, { status: 502 });
  });

  await assert.rejects(integration.completeOAuth('test-code', redirectUri, 'test-verifier'), {
    code: 'OAUTH_ACCOUNT_LOOKUP_FAILED',
    message: 'Microsoft Graph /me returned 502.',
  });
  assert.equal(fetchMock.mock.callCount(), 2);

  fetchMock.mock.mockImplementation(async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  await assert.rejects(integration.completeOAuth('test-code', redirectUri), {
    code: 'OAUTH_TOKEN_EXCHANGE_FAILED', message: 'Token exchange timed out after 15 seconds.',
  });

  fetchMock.mock.mockImplementation(async (url: string) => {
    if (url.endsWith('/token')) return tokenResponse();
    throw new DOMException('Timed out', 'TimeoutError');
  });
  await assert.rejects(integration.completeOAuth('test-code', redirectUri), {
    code: 'OAUTH_ACCOUNT_LOOKUP_FAILED', message: 'Account profile request timed out after 15 seconds.',
  });

  fetchMock.mock.mockImplementation(async (url: string) => url.endsWith('/token') ? tokenResponse()
    : Response.json({ id: 'account-id', userPrincipalName: 'fixture@example.invalid', mail: null }));
  const result = await integration.completeOAuth('test-code', redirectUri);
  assert.deepEqual(result.account, { accountId: 'account-id', email: 'fixture@example.invalid' });
  assert.equal(result.tokens.accessToken, 'test-access');
  assert.equal(result.tokens.refreshToken, 'test-refresh');
});
