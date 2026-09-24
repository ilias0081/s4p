import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';

import { Button } from '../../lib/components/Button';
import { Input } from '../../lib/components/Input';
import { List, ListItem } from '../../lib/components/List';
import { Modal, type ModalHandle } from '../../lib/components/Modal';
import { useCurrentUser, useLogout } from '../login/auth';
import { useCreateWorkflow, useDeleteWorkflow, useUpdateWorkflow, useWorkflows, type Workflow } from './workflows';

export function Dashboard() {
  const sessionQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (sessionQuery.isLoading) {
    return <main className="min-h-screen bg-background p-8 text-text">Loading...</main>;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <Navigate to="/auth" replace />;
  }

  const { user } = sessionQuery.data;
  const initial = user.first_name.charAt(0).toUpperCase();

  const handleLogout = () => {
    setIsMenuOpen(false);
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        void sessionQuery.refetch();
      },
    });
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/15 bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link to="/dashboard" className="text-lg font-bold tracking-[0.06em] text-text">
          s4p
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-primary/30 text-sm font-semibold hover:bg-primary/40"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {initial}
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/15 bg-background p-1 shadow-panel">
              <Link
                to="/dashboard/settings"
                className="block rounded-lg px-3 py-2 text-sm text-secondary hover:bg-white/10 hover:text-text"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-white/10 hover:text-text"
                disabled={logoutMutation.isPending}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </section>
    </main>
  );
}

export function DashboardHome() {
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
        <List id="workflows-list" className="mt-4">
          {workflows.map((workflow) => (
            <ListItem key={workflow.id} id={`workflow-${workflow.id}`}>
              <div className="flex items-center justify-between">
                <span>{workflow.name}</span>
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

export function SettingsPage() {
  return <h2>Settings</h2>;
}

