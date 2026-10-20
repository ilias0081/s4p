import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { db, closeDatabase } from '../src/db/database.js';
import { createWorkflowOperation, getAppMethods, getWorkflowOperations } from '../src/services/workflowEditorService.js';

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
  } finally {
    // Only remove the fixture IDs created by this test.
    await db.deleteFrom('s4p.workflows').where('id', '=', workflowId).where('user_id', '=', userId).execute();
    await db.deleteFrom('s4p.users').where('id', '=', userId).execute();
    await closeDatabase();
  }
});
