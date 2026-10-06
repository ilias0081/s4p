import type { Selectable } from 'kysely';

import { db } from '../db/database.js';
import type { DB } from '../db/types.js';

export type Workflow = Selectable<DB['s4p.workflows']>;

export async function getWorkflowsForUser(userId: string): Promise<Workflow[]> {
  return db
    .selectFrom('s4p.workflows')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('id', 'asc')
    .execute();
}

export async function createWorkflow(userId: string, name: string): Promise<Workflow> {
  return db
    .insertInto('s4p.workflows')
    .values({ user_id: userId, name })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateWorkflowForUser(
  workflowId: string,
  userId: string,
  name: string
): Promise<Workflow | undefined> {
  return db
    .updateTable('s4p.workflows')
    .set({ name })
    .where('id', '=', workflowId)
    .where('user_id', '=', userId)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteWorkflowForUser(workflowId: string, userId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('s4p.workflows')
    .where('id', '=', workflowId)
    .where('user_id', '=', userId)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
}
