import { db } from '../db/database.js';

export async function getApps() {
  return db.selectFrom('s4p.apps')
    .select(['id', 'name', 'ui_name']).orderBy('ui_name').execute();
}

export async function getWorkflowOperations(userId: string, workflowId: string) {
  const workflow = await db.selectFrom('s4p.workflows')
    .select('id').where('id', '=', workflowId).where('user_id', '=', userId)
    .executeTakeFirst();

  if (!workflow) return undefined;

  return db.selectFrom('s4p.operations').selectAll()
    .where('workflow_id', '=', workflowId).orderBy('id').execute();
}
