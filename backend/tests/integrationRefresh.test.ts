import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { db, closeDatabase } from '../src/db/database.js';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';

test('refresh expired credentials, persist rotation, and handle failures without losing tokens', async (t) => {
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const integrationId = randomUUID();
  const otherIntegrationId = randomUUID();
  try {
    // Isolated integrations avoid modifying any real connected accounts.
    for (const id of [integrationId, otherIntegrationId]) {
      await db.insertInto('s4p.integrations').values({ id, name: `refresh_fixture_${id}`, credentials: null,
        developer_account_email: `${id}@example.invalid` }).execute();
    }
    const record = { id: integrationId };
    const integration = new MicrosoftGraph({ id: record.id, name: 'microsoft_graph',
      credentials: JSON.stringify({ clientId: 'test-client', clientSecret: 'test-secret', tenantId: 'common' }) });
    for (const id of [userId, otherUserId]) {
      await db.insertInto('s4p.users').values({ id, first_name: 'Refresh', last_name: 'Fixture', email: `${id}@example.invalid`, password: 'unused' }).execute();
      await db.insertInto('s4p.user_integrations').values({ user_id: id, integration_id: id === userId ? integrationId : otherIntegrationId,
        account_id: id, email: `${id}@example.invalid`, access_token: 'old-access', refresh_token: 'old-refresh',
        access_token_expiry: new Date(0) }).execute();
    }
    const savedAccount = () => db.selectFrom('s4p.user_integrations').selectAll()
      .where('user_id', '=', userId).where('integration_id', '=', record.id).executeTakeFirstOrThrow();
    const expire = () => db.updateTable('s4p.user_integrations').set({ access_token_expiry: new Date(0), needs_reauth: false })
      .where('user_id', '=', userId).where('integration_id', '=', record.id).execute();
    const now = Date.now();
    t.mock.method(Date, 'now', () => now);
    const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.equal(url, 'https://login.microsoftonline.com/common/oauth2/v2.0/token');
      assert.equal(options.method, 'POST');
      const body = options.body as URLSearchParams;
      assert.equal(body.get('grant_type'), 'refresh_token');
      assert.equal(body.get('refresh_token'), 'old-refresh');
      assert.equal(body.get('client_id'), 'test-client');
      assert.equal(body.get('client_secret'), 'test-secret');
      return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 });
    });

    // Concurrent reads must share the persisted refresh and use it on later calls.
    assert.deepEqual(await Promise.all([integration.getAccessToken(userId), integration.getAccessToken(userId)]), ['new-access', 'new-access']);
    assert.equal(fetchMock.mock.callCount(), 1);
    let saved = await savedAccount();
    assert.equal(saved.access_token, 'new-access');
    assert.equal(saved.refresh_token, 'new-refresh');
    assert.equal(saved.access_token_expiry?.getTime(), now + (3600 - 120) * 1000);
    assert.equal(saved.needs_reauth, false);
    assert.equal(await integration.getAccessToken(userId), 'new-access');
    assert.equal(fetchMock.mock.callCount(), 1);
    const untouched = await db.selectFrom('s4p.user_integrations').select('access_token').where('user_id', '=', otherUserId).executeTakeFirstOrThrow();
    assert.equal(untouched.access_token, 'old-access');

    // Providers may omit the replacement refresh token; keep the existing one.
    await expire();
    fetchMock.mock.mockImplementation(async (_url: string, options: RequestInit) => {
      assert.equal((options.body as URLSearchParams).get('refresh_token'), 'new-refresh');
      return Response.json({ access_token: 'second-access', expires_in: 3600 });
    });
    assert.equal(await integration.getAccessToken(userId), 'second-access');
    assert.equal((await savedAccount()).refresh_token, 'new-refresh');

    await expire();
    fetchMock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
    await assert.rejects(integration.getAccessToken(userId), { code: 'UI_ERROR' });
    saved = await savedAccount();
    assert.equal(saved.access_token, 'second-access');
    assert.equal(saved.needs_reauth, false);

    // A malformed success response must not overwrite the saved connection.
    fetchMock.mock.mockImplementation(async () => Response.json({ access_token: '', expires_in: 'invalid' }));
    await assert.rejects(integration.getAccessToken(userId), { code: 'UI_ERROR' });
    assert.equal((await savedAccount()).refresh_token, 'new-refresh');

    fetchMock.mock.mockImplementation(async () => Response.json({ error: 'invalid_grant' }, { status: 400 }));
    await assert.rejects(integration.getAccessToken(userId), { code: 'UI_ERROR' });
    assert.equal((await savedAccount()).needs_reauth, true);
    const calls = fetchMock.mock.callCount();
    await assert.rejects(integration.getAccessToken(userId), { code: 'UI_ERROR' });
    await assert.rejects(integration.getAccessToken(randomUUID()), { code: 'UI_ERROR' });
    assert.equal(fetchMock.mock.callCount(), calls);

    await db.updateTable('s4p.user_integrations').set({ refresh_token: null, needs_reauth: false })
      .where('user_id', '=', userId).execute();
    await assert.rejects(integration.getAccessToken(userId), { code: 'UI_ERROR' });
    assert.equal((await savedAccount()).needs_reauth, true);
    assert.equal(fetchMock.mock.callCount(), calls);
  } finally {
    await db.deleteFrom('s4p.user_integrations').where('user_id', 'in', [userId, otherUserId]).execute();
    await db.deleteFrom('s4p.users').where('id', 'in', [userId, otherUserId]).execute();
    await db.deleteFrom('s4p.integrations').where('id', 'in', [integrationId, otherIntegrationId]).execute();
    await closeDatabase();
  }
});
