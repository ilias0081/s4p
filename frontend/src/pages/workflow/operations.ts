import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api/api';

export type OperationType = 'action_in_app' | 'ai_data_trans' | 'condition' | 'data_trans' | 'loop' | 'trigger';

export type RawOperation = {
  id: string;
  workflow_id: string;
  type: OperationType;
  configuration: unknown;
  next_operation_id_true: string | null;
  next_operation_id_false: string | null;
  previous_operation_id: string | null;
};

export interface Operation {
  id: string;
  type: OperationType;
  configuration: unknown;
  next: { true: Operation | null; false: Operation | null };
  previous: Operation | null;
}

export class BaseOperation implements Operation {
  id: string;
  type: OperationType;
  configuration: unknown;
  next: Operation['next'] = { true: null, false: null };
  previous: Operation | null = null;

  constructor(raw: RawOperation) {
    this.id = raw.id;
    this.type = raw.type;
    this.configuration = raw.configuration;
  }
}

export function modelOperations(rows: RawOperation[]): BaseOperation[] {
  // Create every instance first, so links share the same objects (including cycles).
  const byId = new Map(rows.map((row) => [row.id, new BaseOperation(row)]));
  for (const row of rows) {
    const operation = byId.get(row.id)!;
    operation.next.true = byId.get(row.next_operation_id_true ?? '') ?? null;
    operation.next.false = byId.get(row.next_operation_id_false ?? '') ?? null;
    operation.previous = byId.get(row.previous_operation_id ?? '') ?? null;
  }
  return [...byId.values()];
}

export function useWorkflowOperations(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-operations', workflowId],
    enabled: !!workflowId,
    queryFn: () => api.get(`workflows/${workflowId}/operations`).json<{ operations: RawOperation[] }>(),
    select: ({ operations }) => modelOperations(operations),
  });
}
