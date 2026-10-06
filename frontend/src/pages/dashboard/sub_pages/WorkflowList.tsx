import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../../lib/components/Button/Button';
import { Input } from '../../../lib/components/Input/Input';
import { List, ListItem } from '../../../lib/components/List/List';
import { Modal, type ModalHandle } from '../../../lib/components/Modal/Modal';
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useUpdateWorkflow,
  useWorkflows,
  type Workflow,
} from '../workflows';

export function WorkflowList() {
  const navigate = useNavigate();
  const workflowsQuery = useWorkflows();
  const createWorkflowMutation = useCreateWorkflow();
  const updateWorkflowMutation = useUpdateWorkflow();
  const deleteWorkflowMutation = useDeleteWorkflow();

  const workflowModalRef = useRef<ModalHandle<Workflow | undefined>>(null);
  const deleteModalRef = useRef<ModalHandle<Workflow>>(null);

  if (workflowsQuery.isLoading) {
    return <p className="text-secondary">Loading workflows...</p>;
  }

  if (workflowsQuery.isError) {
    return <p className="text-red-400">Unable to load workflows.</p>;
  }

  const workflows = workflowsQuery.data?.workflows ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2>Workflows</h2>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => workflowModalRef.current?.showModal()}
        >
          Add Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <p className="mt-4 text-secondary">No workflows yet.</p>
      ) : (
        <List id="workflows-list" hasSearch className="mt-4">
          {workflows.map((workflow) => (
            <ListItem key={workflow.id} id={`workflow-${workflow.id}`}>
              <div className="flex items-center justify-between">
                <span className="searchable">{workflow.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => workflowModalRef.current?.showModal(workflow)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteModalRef.current?.showModal(workflow)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="neutral"
                    size="sm"
                    aria-label="Open workflow"
                    onClick={() => navigate(`/dashboard/workflows/${workflow.id}`)}
                  >
                    →
                  </Button>
                </div>
              </div>
            </ListItem>
          ))}
        </List>
      )}

      <Modal<Workflow | undefined>
        ref={workflowModalRef}
        add_title="Add workflow"
        edit_title="Edit workflow"
        button_alignment="right"
        body={({ data }) => (
          <Input label="Workflow name" name="name" defaultValue={data?.name ?? ''} required />
        )}
        footer={({ isEdit, status }) => (
          <>
            <Button
              type="button"
              variant="neutral"
              onClick={() => workflowModalRef.current?.hideModal()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={status === 'loading'}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </>
        )}
        submit={async (data, event) => {
          const formData = new FormData(event.currentTarget);
          const name = String(formData.get('name') ?? '').trim();

          if (!name) {
            throw new Error('Workflow name is required.');
          }

          if (data?.id) {
            await updateWorkflowMutation.mutateAsync({ id: data.id, name });
          } else {
            await createWorkflowMutation.mutateAsync(name);
          }

          workflowModalRef.current?.hideModal();
        }}
      />

      <Modal<Workflow>
        ref={deleteModalRef}
        add_title="Delete workflow"
        button_alignment="right"
        body={({ data }) => (
          <p>
            Are you sure you want to delete <strong>{data?.name}</strong>? This cannot be undone.
          </p>
        )}
        footer={({ status }) => (
          <>
            <Button
              type="button"
              variant="neutral"
              onClick={() => deleteModalRef.current?.hideModal()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={status === 'loading'}>
              Delete
            </Button>
          </>
        )}
        submit={async (data) => {
          if (!data?.id) {
            throw new Error('Workflow not found.');
          }

          await deleteWorkflowMutation.mutateAsync(data.id);
          deleteModalRef.current?.hideModal();
        }}
      />
    </div>
  );
}
