import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { db, closeDatabase } from '../src/db/database.js';
import MicrosoftGraph from '../src/integrations/microsoft_graph/microsoft_graph.js';
import { createWorkflowOperation, deleteWorkflowOperation, getAppMethods, getAppMethodInputSchema, getWorkflowOperations,
  getReferenceOperations, executeOperation, updateWorkflowOperation, type OperationOutputCache } from '../src/services/workflowEditorService.js';

test('save app operations, preserve links, and reject invalid edits', async (t) => {
  const userId = randomUUID();
  const workflowId = randomUUID();
  try {
    const app = await db.selectFrom('s4p.apps').select('id').where('name', '=', 'outlook').executeTakeFirstOrThrow();
    assert.deepEqual((await getAppMethods(app.id, 'trigger')).map((method) => method.method), ['new_email_in_inbox']);
    assert.deepEqual((await getAppMethods(app.id, 'action_in_app')).map((method) => method.method), ['send_email']);
    const schema = await getAppMethodInputSchema(app.id, 'send_email');
    assert.equal(schema.properties?.recipients.type, 'array');
    assert.equal(schema.properties?.body.type, 'string');
    assert.equal(schema.properties?.body.multiline, true);
    await assert.rejects(getAppMethodInputSchema(app.id, 'unknown_method'), { code: 'UI_ERROR' });
    await db.insertInto('s4p.users').values({ id: userId, first_name: 'Workflow test', last_name: 'Fixture', email: `${userId}@example.invalid`, password: 'unused-test-fixture' }).execute();
    await db.insertInto('s4p.workflows').values({ id: workflowId, user_id: userId, name: 'Workflow persistence test' }).execute();

    const triggerInput = { appId: app.id, method: 'new_email_in_inbox', type: 'trigger' as const };
    const actionInput = { appId: app.id, method: 'send_email', type: 'action_in_app' as const,
      configuration: { recipients: ['recipient@example.com'], subject: 'Test email', body: 'Hello' } };
    await assert.rejects(createWorkflowOperation(userId, workflowId, actionInput), {
      code: 'UI_ERROR', message: 'Start this workflow with a trigger.',
    });
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 0);

    // Two simultaneous initial saves must not create two triggers.
    const attempts = await Promise.allSettled([
      createWorkflowOperation(userId, workflowId, triggerInput),
      createWorkflowOperation(userId, workflowId, triggerInput),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
    const trigger = (await getWorkflowOperations(userId, workflowId))![0];
    assert.deepEqual(trigger.configuration, {});
    assert.equal(trigger.app_id, app.id);
    assert.equal(trigger.app_method, 'new_email_in_inbox');

    const position = { sourceId: trigger.id, branch: 'true' as const, targetId: null };
    await assert.rejects(createWorkflowOperation(userId, workflowId, { ...actionInput, position,
      configuration: { ...actionInput.configuration, recipients: ['not-an-email'] } }), { name: 'ZodError' });
    await assert.rejects(createWorkflowOperation(userId, workflowId, { ...actionInput, position,
      configuration: {} }), { name: 'ZodError' });
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 1);

    const action = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: trigger.id, branch: 'true', targetId: null } });
    const inserted = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: trigger.id, branch: 'true', targetId: action.id } });
    const operations = (await getWorkflowOperations(userId, workflowId))!;
    assert.equal(operations.find((operation) => operation.id === trigger.id)!.next_operation_id_true, inserted.id);
    assert.equal(inserted.previous_operation_id, trigger.id);
    assert.equal(inserted.next_operation_id_true, action.id);
    assert.equal(operations.find((operation) => operation.id === action.id)!.previous_operation_id, inserted.id);
    assert.deepEqual(action.configuration, {
      ...actionInput.configuration, cc: [], bcc: [], saveToSentItems: true,
    });
    assert.deepEqual(inserted.configuration, action.configuration);

    // Editing changes only the saved inputs/app method, never the operation's links.
    const editedInput = { ...actionInput, configuration: { ...actionInput.configuration, subject: 'Edited subject' } };
    const edited = await updateWorkflowOperation(userId, workflowId, inserted.id, editedInput);
    assert.equal(edited.id, inserted.id);
    assert.equal(edited.previous_operation_id, trigger.id);
    assert.equal(edited.next_operation_id_true, action.id);
    assert.equal(edited.next_operation_id_false, inserted.next_operation_id_false);
    assert.equal((edited.configuration as { subject: string }).subject, 'Edited subject');
    assert.deepEqual((await getWorkflowOperations(userId, workflowId))!.find((item) => item.id === inserted.id), edited);
    await assert.rejects(updateWorkflowOperation(randomUUID(), workflowId, inserted.id, editedInput), { code: 'UI_ERROR' });
    await assert.rejects(updateWorkflowOperation(userId, workflowId, randomUUID(), editedInput), { code: 'UI_ERROR' });
    await assert.rejects(updateWorkflowOperation(userId, workflowId, trigger.id, editedInput), { code: 'UI_ERROR' });
    await assert.rejects(updateWorkflowOperation(userId, workflowId, inserted.id, triggerInput), { code: 'UI_ERROR' });
    await assert.rejects(updateWorkflowOperation(userId, workflowId, inserted.id, { ...editedInput,
      configuration: { ...editedInput.configuration, recipients: ['invalid'] } }), { name: 'ZodError' });
    for (const forbiddenId of [inserted.id, action.id]) {
      await assert.rejects(updateWorkflowOperation(userId, workflowId, inserted.id, { ...editedInput,
        configuration: { ...editedInput.configuration, body: `\${[${forbiddenId}].subject}` } }), { code: 'UI_ERROR' });
    }
    const referencedEdit = await updateWorkflowOperation(userId, workflowId, inserted.id, { ...editedInput,
      configuration: { ...editedInput.configuration, body: `\${[${trigger.id}].subject}` } });
    assert.equal((referencedEdit.configuration as { body: string }).body, `\${[${trigger.id}].subject}`);
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 3);

    // Readonly previews must be authorized before reading even a warm session cache.
    assert.deepEqual(await getReferenceOperations(userId, workflowId, inserted.id), [{ id: trigger.id, ui_name: 'New email in inbox' }]);
    const cache: OperationOutputCache = {};
    t.mock.method(MicrosoftGraph.prototype, 'getAccessToken', async (executingUserId: string) => {
      assert.equal(executingUserId, userId);
      return 'test-token';
    });
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ value: [{ id: 'email-id', subject: 'Preview' }] }));
    const firstPreview = await executeOperation(userId, workflowId, trigger.id, inserted.id, cache);
    assert.deepEqual(firstPreview.output, { id: 'email-id', subject: 'Preview' });
    assert.equal(firstPreview.expiresAt, now + 300_000);
    now += 299_999;
    assert.deepEqual(await executeOperation(userId, workflowId, trigger.id, inserted.id, cache), firstPreview);
    assert.equal(fetchMock.mock.callCount(), 1);
    now++;
    await executeOperation(userId, workflowId, trigger.id, inserted.id, cache);
    assert.equal(fetchMock.mock.callCount(), 2);
    await executeOperation(userId, workflowId, trigger.id, inserted.id, {});
    assert.equal(fetchMock.mock.callCount(), 3); // A separate session does not share outputs.
    await assert.rejects(executeOperation(randomUUID(), workflowId, trigger.id, inserted.id, cache), { code: 'UI_ERROR' });
    await assert.rejects(executeOperation(userId, workflowId, action.id, trigger.id, cache), { code: 'UI_ERROR' });
    await assert.rejects(executeOperation(userId, workflowId, action.id, action.id, cache), {
      code: 'UI_ERROR', message: 'Only readonly operations can be previewed.',
    });
    assert.equal(fetchMock.mock.callCount(), 3);

    const reference = `\${[${trigger.id}].from.emailAddress.address}`;
    const referencedAction = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      configuration: { ...actionInput.configuration, recipients: [reference], body: `Replying to \${[${trigger.id}].subject}` },
      position: { sourceId: action.id, branch: 'true', targetId: null } });
    assert.deepEqual((referencedAction.configuration as { recipients: string[] }).recipients, [reference]);
    await deleteWorkflowOperation(userId, workflowId, referencedAction.id);
    await assert.rejects(createWorkflowOperation(userId, workflowId, { ...actionInput,
      configuration: { ...actionInput.configuration, recipients: [`\${[${action.id}].subject}`] },
      position: { sourceId: trigger.id, branch: 'true', targetId: inserted.id } }), { code: 'UI_ERROR' });

    await assert.rejects(createWorkflowOperation(randomUUID(), workflowId, actionInput), { code: 'UI_ERROR' });
    await assert.rejects(createWorkflowOperation(userId, workflowId, { ...actionInput, method: 'new_email_in_inbox' }), { code: 'UI_ERROR' });
    await assert.rejects(createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: trigger.id, branch: 'true', targetId: action.id } }), { code: 'UI_ERROR' });
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 3);

    await assert.rejects(deleteWorkflowOperation(randomUUID(), workflowId, inserted.id), { code: 'UI_ERROR' });
    await assert.rejects(deleteWorkflowOperation(userId, workflowId, randomUUID()), { code: 'UI_ERROR' });

    // Removing a middle operation contracts the chain in both directions.
    await deleteWorkflowOperation(userId, workflowId, inserted.id);
    let remaining = (await getWorkflowOperations(userId, workflowId))!;
    assert.equal(remaining.length, 2);
    assert.equal(remaining.find((item) => item.id === trigger.id)!.next_operation_id_true, action.id);
    assert.equal(remaining.find((item) => item.id === action.id)!.previous_operation_id, trigger.id);

    await assert.rejects(deleteWorkflowOperation(userId, workflowId, trigger.id), {
      code: 'UI_ERROR', message: 'Remove the operations after this trigger before deleting it.',
    });
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 2);
    await deleteWorkflowOperation(userId, workflowId, action.id);
    remaining = (await getWorkflowOperations(userId, workflowId))!;
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, trigger.id);
    assert.equal(remaining[0].previous_operation_id, null);
    await deleteWorkflowOperation(userId, workflowId, trigger.id);
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 0);

    // Terminal deletion also clears a false-branch link.
    const secondTrigger = await createWorkflowOperation(userId, workflowId, triggerInput);
    const falseAction = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: secondTrigger.id, branch: 'false', targetId: null } });
    const trueAction = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: secondTrigger.id, branch: 'true', targetId: null } });
    await assert.rejects(executeOperation(userId, workflowId, trueAction.id, falseAction.id, cache), { code: 'UI_ERROR' });
    await assert.rejects(deleteWorkflowOperation(userId, workflowId, secondTrigger.id), { code: 'UI_ERROR' });
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 3);
    await deleteWorkflowOperation(userId, workflowId, falseAction.id);
    await assert.rejects(deleteWorkflowOperation(userId, workflowId, secondTrigger.id), { code: 'UI_ERROR' });
    await deleteWorkflowOperation(userId, workflowId, trueAction.id);
    remaining = (await getWorkflowOperations(userId, workflowId))!;
    assert.equal(remaining[0].next_operation_id_false, null);
    assert.equal(remaining[0].next_operation_id_true, null);
    await deleteWorkflowOperation(userId, workflowId, secondTrigger.id);
  } finally {
    // Only remove the fixture IDs created by this test.
    await db.deleteFrom('s4p.workflows').where('id', '=', workflowId).where('user_id', '=', userId).execute();
    await db.deleteFrom('s4p.users').where('id', '=', userId).execute();
    await closeDatabase();
  }
});
