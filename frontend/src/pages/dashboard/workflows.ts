import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../lib/api/api';

export type Workflow = {
  id: string;
  user_id: string;
  name: string;
};

export type WorkflowsResponse = {
  workflows: Workflow[];
};

export type WorkflowResponse = {
  message: string;
  workflow: Workflow;
};

export async function getWorkflows(): Promise<WorkflowsResponse> {
  return api.get('workflows').json<WorkflowsResponse>();
}

export async function createWorkflow(name: string): Promise<WorkflowResponse> {
  return api.post('workflows', { json: { name } }).json<WorkflowResponse>();
}

export async function updateWorkflow(id: string, name: string): Promise<WorkflowResponse> {
  return api.put(`workflows/${id}`, { json: { name } }).json<WorkflowResponse>();
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api.delete(`workflows/${id}`);
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: getWorkflows,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateWorkflow(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
