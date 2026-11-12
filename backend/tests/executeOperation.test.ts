import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { db, closeDatabase } from '../src/db/database.js';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';
import { createUser } from '../src/services/authService.js';
import { createWorkflowOperation } from '../src/services/workflowEditorService.js';

test('executeOperation endpoint caches output in the authenticated session', async (t) => {
  const httpFetch = globalThis.fetch;
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const workflowId = randomUUID();
  let userId: string | undefined;
  try {
    const email = `${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const user = await createUser({ firstName: 'Preview', lastName: 'Fixture', email, password });
    userId = user.id;
    await db.insertInto('s4p.workflows').values({ id: workflowId, user_id: user.id, name: 'Preview test' }).execute();
    const app = await db.selectFrom('s4p.apps').select('id').where('name', '=', 'outlook').executeTakeFirstOrThrow();
    const trigger = await createWorkflowOperation(user.id, workflowId, { appId: app.id, method: 'new_email_in_inbox', type: 'trigger' });
    const endpoint = `${baseUrl}/workflows/${workflowId}/operations/${trigger.id}/execute`;
    const previewBody = JSON.stringify({ sourceId: trigger.id });

    t.mock.method(MicrosoftGraph.prototype, 'getAccessToken', async () => 'test-token');
    const graphFetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ value: [{ id: 'email', subject: 'Hello' }] }));

    const csrfResponse = await httpFetch(`${baseUrl}/csrf-token`);
    const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
    const csrfCookie = csrfResponse.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
    const headers = { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken, Cookie: csrfCookie };
    const login = await httpFetch(`${baseUrl}/login`, { method: 'POST', headers, body: JSON.stringify({ email, password }) });
    assert.equal(login.status, 200);
    headers.Cookie += `; ${login.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ')}`;

    const list = await httpFetch(`${baseUrl}/workflows/${workflowId}/reference-operations?sourceId=${trigger.id}`, { headers });
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), { operations: [{ id: trigger.id, ui_name: 'New email in inbox' }] });
    const first = await httpFetch(endpoint, { method: 'POST', headers, body: previewBody });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    const firstOutput = await first.json();
    const second = await httpFetch(endpoint, { method: 'POST', headers, body: previewBody });
    assert.deepEqual(await second.json(), firstOutput);
    assert.equal(graphFetch.mock.callCount(), 1);

    const updateUrl = `${baseUrl}/workflows/${workflowId}/operations/${trigger.id}`;
    const updateBody = JSON.stringify({ appId: app.id, type: 'trigger', method: 'new_email_in_inbox', configuration: {} });
    const update = await httpFetch(updateUrl, { method: 'PATCH', headers, body: updateBody });
    assert.equal(update.status, 200);
    const updated = await update.json() as { operation: { id: string; previous_operation_id: string | null } };
    assert.equal(updated.operation.id, trigger.id);
    assert.equal(updated.operation.previous_operation_id, null);
    const invalidUpdate = await httpFetch(updateUrl, { method: 'PATCH', headers,
      body: JSON.stringify({ appId: app.id, type: 'action_in_app', method: 'send_email', configuration: {} }) });
    assert.equal(invalidUpdate.status, 400);

    const logout = await httpFetch(`${baseUrl}/logout`, { method: 'POST', headers });
    assert.equal(logout.status, 204);
    const expiredSession = await httpFetch(endpoint, { method: 'POST', headers, body: previewBody });
    assert.equal(expiredSession.status, 401);
    assert.equal((await httpFetch(updateUrl, { method: 'PATCH', headers, body: updateBody })).status, 401);
    assert.equal(graphFetch.mock.callCount(), 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (userId) {
      await db.deleteFrom('s4p.workflows').where('id', '=', workflowId).where('user_id', '=', userId).execute();
      await db.deleteFrom('s4p.users').where('id', '=', userId).execute();
    }
    await closeDatabase();
  }
});
