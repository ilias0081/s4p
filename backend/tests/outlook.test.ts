import assert from 'node:assert/strict';
import test from 'node:test';

import Outlook from '../src/apps/outlook/outlook.js';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';

test('send email maps recipients and handles the empty Graph response without retrying', async (t) => {
  const integration = new MicrosoftGraph({ id: 'integration-id', name: 'microsoft_graph', credentials: null });
  t.mock.method(integration, 'getAccessToken', async (userId: string) => {
    assert.equal(userId, 'user-id');
    return 'test-token';
  });
  const requests: Record<string, any>[] = [];
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, 'https://graph.microsoft.com/v1.0/me/sendMail');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.headers, { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' });
    assert.ok(options.signal instanceof AbortSignal);
    requests.push(JSON.parse(options.body as string));
    return new Response(null, { status: 202 });
  });
  const outlook = new Outlook(integration);
  outlook.setAppExecutionContext({ userId: 'user-id', operationId: 'operation-id', workflowId: 'workflow-id' });
  const input = {
    recipients: ['to@example.com', 'other@example.com'],
    cc: ['cc@example.com'], bcc: ['bcc@example.com'],
    subject: 'Hello', body: 'First line\nSecond line', saveToSentItems: false,
  };

  assert.deepEqual(await outlook.executeMethod('send_email', input), { accepted: true });
  assert.deepEqual(requests[0], {
    message: {
      subject: input.subject, body: { contentType: 'Text', content: input.body },
      toRecipients: [{ emailAddress: { address: 'to@example.com' } }, { emailAddress: { address: 'other@example.com' } }],
      ccRecipients: [{ emailAddress: { address: 'cc@example.com' } }],
      bccRecipients: [{ emailAddress: { address: 'bcc@example.com' } }],
    },
    saveToSentItems: false,
  });

  await outlook.executeMethod('send_email', { recipients: input.recipients, subject: input.subject, body: input.body });
  assert.equal(requests[1].saveToSentItems, true);
  assert.deepEqual(requests[1].message.ccRecipients, []);
  assert.deepEqual(requests[1].message.bccRecipients, []);

  await assert.rejects(outlook.executeMethod('send_email', { ...input, recipients: [] }));
  assert.equal(fetchMock.mock.callCount(), 2);

  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 403 }));
  await assert.rejects(outlook.executeMethod('send_email', input), {
    code: 'EXTERNAL_SERVICE_FAILED', message: 'Microsoft Graph sendMail request returned 403.',
  });
  assert.equal(fetchMock.mock.callCount(), 3);

  fetchMock.mock.mockImplementation(async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  await assert.rejects(outlook.executeMethod('send_email', input), {
    code: 'EXTERNAL_SERVICE_TIMEOUT', message: 'Microsoft Graph sendMail request timed out after 15 seconds.',
  });
  assert.equal(fetchMock.mock.callCount(), 4);
});

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
    code: 'EXTERNAL_SERVICE_FAILED', message: 'Microsoft Graph inbox request returned 401.',
  });

  fetchMock.mock.mockImplementation(async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  await assert.rejects(outlook.executeMethod('new_email_in_inbox', {}), {
    code: 'EXTERNAL_SERVICE_TIMEOUT', message: 'Microsoft Graph inbox request timed out after 15 seconds.',
  });
});
