import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { db, closeDatabase } from '../src/db/database.js';
import { createWorkflowOperation, deleteWorkflowOperation, getAppMethods, getWorkflowOperations } from '../src/services/workflowEditorService.js';

test('save app operations, preserve links, and reject invalid edits', async () => {
  const userId = randomUUID();
  const workflowId = randomUUID();
  try {
    const app = await db.selectFrom('s4p.apps').select('id').where('name', '=', 'outlook').executeTakeFirstOrThrow();
    assert.deepEqual((await getAppMethods(app.id, 'trigger')).map((method) => method.method), ['new_email_in_inbox']);
    assert.deepEqual((await getAppMethods(app.id, 'action_in_app')).map((method) => method.method), ['send_email']);
    await db.insertInto('s4p.users').values({ id: userId, first_name: 'Workflow test', last_name: 'Fixture', email: `${userId}@example.invalid`, password: 'unused-test-fixture' }).execute();
    await db.insertInto('s4p.workflows').values({ id: workflowId, user_id: userId, name: 'Workflow persistence test' }).execute();

    const triggerInput = { appId: app.id, method: 'new_email_in_inbox', type: 'trigger' as const };
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

    const actionInput = { appId: app.id, method: 'send_email', type: 'action_in_app' as const };
    const action = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: trigger.id, branch: 'true', targetId: null } });
    const inserted = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: trigger.id, branch: 'true', targetId: action.id } });
    const operations = (await getWorkflowOperations(userId, workflowId))!;
    assert.equal(operations.find((operation) => operation.id === trigger.id)!.next_operation_id_true, inserted.id);
    assert.equal(inserted.previous_operation_id, trigger.id);
    assert.equal(inserted.next_operation_id_true, action.id);
    assert.equal(operations.find((operation) => operation.id === action.id)!.previous_operation_id, inserted.id);
    assert.ok(operations.every((operation) => JSON.stringify(operation.configuration) === '{}'));

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

    await deleteWorkflowOperation(userId, workflowId, trigger.id);
    remaining = (await getWorkflowOperations(userId, workflowId))!;
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].previous_operation_id, null);
    await deleteWorkflowOperation(userId, workflowId, action.id);
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 0);

    // Terminal deletion also clears a false-branch link.
    const secondTrigger = await createWorkflowOperation(userId, workflowId, triggerInput);
    const falseAction = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: secondTrigger.id, branch: 'false', targetId: null } });
    const trueAction = await createWorkflowOperation(userId, workflowId, { ...actionInput,
      position: { sourceId: secondTrigger.id, branch: 'true', targetId: null } });
    await assert.rejects(deleteWorkflowOperation(userId, workflowId, secondTrigger.id), { code: 'UI_ERROR' });
    assert.equal((await getWorkflowOperations(userId, workflowId))!.length, 3);
    await deleteWorkflowOperation(userId, workflowId, falseAction.id);
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
