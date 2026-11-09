import { db } from '../db/database.js';
import type { App, AppMethodType } from '../lib/App.js';
import type { Integration } from '../lib/Integration.js';
import { codedError } from '../lib/utils.js';
import { loadIntegration } from './integrationService.js';

async function loadApp(appId: string): Promise<App> {
  const record = await db.selectFrom('s4p.apps').select(['name', 'integration_id'])
    .where('id', '=', appId).executeTakeFirst();
  if (!record) throw codedError('UI_ERROR', 'App not found.');
  if (!/^[a-z0-9_]+$/.test(record.name)) throw codedError('UI_ERROR', 'This app is not supported yet.');

  let module: { default: new (integration: Integration) => App };
  try {
    const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
    module = await import(`../apps/${record.name}/${record.name}.${extension}`);
  } catch {
    throw codedError('UI_ERROR', 'This app is not supported yet.');
  }
  return new module.default(await loadIntegration(record.integration_id));
}

export async function getAppMethods(appId: string, type: AppMethodType) {
  return (await loadApp(appId)).getAppMethods(type);
}

export type CreateOperationInput = {
  appId: string;
  method: string;
  type: AppMethodType;
  position?: { sourceId: string; branch: 'true' | 'false'; targetId: string | null };
};

export async function createWorkflowOperation(userId: string, workflowId: string, input: CreateOperationInput) {
  return db.transaction().execute(async (trx) => {
    // Serialize edits within a workflow, including two concurrent first-trigger saves.
    const workflow = await trx.selectFrom('s4p.workflows').select('id')
      .where('id', '=', workflowId).where('user_id', '=', userId).forUpdate().executeTakeFirst();
    if (!workflow) throw codedError('UI_ERROR', 'Workflow not found.');

    const methods = await getAppMethods(input.appId, input.type);
    if (!methods.some((method) => method.method === input.method)) {
      throw codedError('UI_ERROR', 'Choose a valid method for this operation type.');
    }

    const operations = await trx.selectFrom('s4p.operations').selectAll()
      .where('workflow_id', '=', workflowId).execute();
    const { position } = input;
    if (!operations.length) {
      if (input.type !== 'trigger' || position) throw codedError('UI_ERROR', 'Start this workflow with a trigger.');
    } else {
      if (!position) throw codedError('UI_ERROR', 'Choose where to add this operation.');
    }

    const nextColumn = position?.branch === 'false' ? 'next_operation_id_false' : 'next_operation_id_true';
    if (position) {
      const source = operations.find((operation) => operation.id === position.sourceId);
      const target = operations.find((operation) => operation.id === position.targetId);
      if (!source || source[nextColumn] !== position.targetId ||
        (position.targetId !== null && (!target || target.previous_operation_id !== source.id))) {
        throw codedError('UI_ERROR', 'This connection has changed. Refresh the workflow and try again.');
      }
    }

    const operation = await trx.insertInto('s4p.operations').values({
      workflow_id: workflowId,
      type: input.type,
      app_id: input.appId,
      app_method: input.method,
      configuration: {},
      previous_operation_id: position?.sourceId ?? null,
      next_operation_id_true: position?.targetId ?? null,
      next_operation_id_false: null,
    }).returningAll().executeTakeFirstOrThrow();

    if (position) {
      await trx.updateTable('s4p.operations').set({ [nextColumn]: operation.id })
        .where('id', '=', position.sourceId).where('workflow_id', '=', workflowId).execute();
      if (position.targetId) {
        await trx.updateTable('s4p.operations').set({ previous_operation_id: operation.id })
          .where('id', '=', position.targetId).where('workflow_id', '=', workflowId).execute();
      }
    }
    return operation;
  });
}

export async function getApps() {
  return db.selectFrom('s4p.apps')
    .select(['id', 'name', 'ui_name']).orderBy('ui_name').execute();
}

export async function deleteWorkflowOperation(userId: string, workflowId: string, operationId: string) {
  return db.transaction().execute(async (trx) => {
    const workflow = await trx.selectFrom('s4p.workflows').select('id')
      .where('id', '=', workflowId).where('user_id', '=', userId).forUpdate().executeTakeFirst();
    if (!workflow) throw codedError('UI_ERROR', 'Workflow not found.');

    const operations = await trx.selectFrom('s4p.operations').selectAll()
      .where('workflow_id', '=', workflowId).execute();
    const operation = operations.find((item) => item.id === operationId);
    if (!operation) throw codedError('UI_ERROR', 'Operation not found.');

    const successors = [...new Set([operation.next_operation_id_true, operation.next_operation_id_false]
      .filter((id): id is string => id !== null && id !== operationId))];
    if (successors.length > 1) {
      throw codedError('UI_ERROR', 'Remove one of the outgoing branches before deleting this operation.');
    }
    const nextId = successors[0] ?? null;
    const previousId = operation.previous_operation_id === operationId ? null : operation.previous_operation_id;

    // Remove all references before deleting, preserving the remaining chain.
    for (const item of operations) {
      if (item.id === operationId) continue;

      const changes: {
        next_operation_id_true?: string | null;
        next_operation_id_false?: string | null;
        previous_operation_id?: string | null;
      } = {};

      if (item.next_operation_id_true === operationId) changes.next_operation_id_true = nextId;
      if (item.next_operation_id_false === operationId) changes.next_operation_id_false = nextId;
      if (item.previous_operation_id === operationId) changes.previous_operation_id = previousId;
      
      if (Object.keys(changes).length) {
        await trx.updateTable('s4p.operations').set(changes).where('id', '=', item.id)
          .where('workflow_id', '=', workflowId).execute();
      }
    }
    await trx.deleteFrom('s4p.operations').where('id', '=', operationId)
      .where('workflow_id', '=', workflowId).execute();
  });
}

export async function getWorkflowOperations(userId: string, workflowId: string) {
  const workflow = await db.selectFrom('s4p.workflows')
    .select('id').where('id', '=', workflowId).where('user_id', '=', userId)
    .executeTakeFirst();

  if (!workflow) return undefined;

  return db.selectFrom('s4p.operations').selectAll()
    .where('workflow_id', '=', workflowId).orderBy('id').execute();
}
