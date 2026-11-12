import assert from 'node:assert/strict';
import test from 'node:test';

import Outlook from '../src/apps/outlook/outlook.js';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';

test('inbox trigger fetches one newest email for the executing user', async (t) => {
  const integration = new MicrosoftGraph({ id: 'integration-id', name: 'microsoft_graph', credentials: null });
  t.mock.method(integration, 'getAccessToken', async (userId: string) => {
    assert.equal(userId, 'user-id');
    return 'test-token';
  });
  const email = { id: 'message-id', subject: 'Hello', body: { content: 'Email body' } };
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: URL, options: RequestInit) => {
    assert.equal(url.origin + url.pathname, 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages');
    assert.equal(url.searchParams.get('$top'), '1');
    assert.equal(url.searchParams.get('$orderby'), 'receivedDateTime desc');
    assert.deepEqual(options.headers, { Authorization: 'Bearer test-token' });
    return Response.json({ value: [email] });
  });
  const outlook = new Outlook(integration);
  await assert.rejects(outlook.executeMethod('new_email_in_inbox', {}), {
    code: 'APP_EXECUTION_CONTEXT_MISSING',
  });
  assert.equal(fetchMock.mock.callCount(), 0);
  outlook.setAppExecutionContext({ userId: 'user-id', operationId: 'operation-id', workflowId: 'workflow-id' });

  assert.deepEqual(await outlook.executeMethod('new_email_in_inbox', {}), email);
  assert.equal(fetchMock.mock.callCount(), 1);

  fetchMock.mock.mockImplementation(async () => Response.json({ value: [] }));
  assert.equal(await outlook.executeMethod('new_email_in_inbox', {}), null);

  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 401 }));
  await assert.rejects(outlook.executeMethod('new_email_in_inbox', {}), {
    code: 'UI_ERROR', message: 'Unable to read your Outlook inbox (Microsoft Graph returned 401).',
  });
});
