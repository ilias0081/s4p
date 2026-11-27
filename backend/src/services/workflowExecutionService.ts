import type { Selectable } from 'kysely';

import type { S4pOperations } from '../db/types.js';

export async function runTriggeredWorkflow(
  _userId: string,
  _trigger: Selectable<S4pOperations>,
  _output: unknown,
): Promise<void> {
  // Workflow execution will be implemented here.
}
