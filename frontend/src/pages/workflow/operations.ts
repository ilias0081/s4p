import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api/api';

export type OperationType = 'action_in_app' | 'ai_data_trans' | 'condition' | 'data_trans' | 'loop' | 'trigger';

export type RawOperation = {
  app_id: string | null;
  app_method: string | null;
  id: string;
  workflow_id: string;
  type: OperationType;
  configuration: unknown;
  next_operation_id_true: string | null;
  next_operation_id_false: string | null;
  previous_operation_id: string | null;
};

export interface Operation {
  appId: string | null;
  method: string | null;
  id: string;
  type: OperationType;
  configuration: unknown;
  next: { true: Operation | null; false: Operation | null };
  previous: Operation | null;
}

export class BaseOperation implements Operation {
  appId: string | null;
  method: string | null;
  id: string;
  type: OperationType;
  configuration: unknown;
  next: Operation['next'] = { true: null, false: null };
  previous: Operation | null = null;

  constructor(raw: RawOperation) {
    this.appId = raw.app_id;
    this.method = raw.app_method;
    this.id = raw.id;
    this.type = raw.type;
    this.configuration = raw.configuration;
  }
}

export type OperationPosition = { sourceId: string; branch: 'true' | 'false'; targetId: string | null };
export type AppMethodType = 'trigger' | 'action_in_app';
export type AppMethod = { method: string; ui_name: string; description: string; types: AppMethodType[] };

export function useAppMethods(appId: string | undefined, type: AppMethodType | null) {
  return useQuery({
    queryKey: ['app-methods', appId, type],
    enabled: !!appId && !!type,
    queryFn: () => api.get(`apps/${appId}/methods`, { searchParams: { type: type! } }).json<{ methods: AppMethod[] }>(),
  });
}

export function useCreateOperation(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appId: string; method: string; type: AppMethodType; position?: OperationPosition }) =>
      api.post(`workflows/${workflowId}/operations`, { json: input }).json<{ operation: RawOperation }>(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-operations', workflowId] });
    },
  });
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
