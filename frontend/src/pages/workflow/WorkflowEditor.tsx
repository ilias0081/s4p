import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useWorkflows } from '../dashboard/workflows';
import { useWorkflowOperations, type OperationPosition } from './operations';
import { OperationsCanvas } from './OperationsCanvas';
import { OperationModal } from './OperationModal';
import { Button } from '../../lib/components/Button/Button';
import './workflow_editor.css';

export function WorkflowEditor() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const workflowsQuery = useWorkflows();
  const operationsQuery = useWorkflowOperations(workflowId);
  const [modalMode, setModalMode] = useState<'choose' | 'trigger' | null>(null);
  const [position, setPosition] = useState<OperationPosition>();
  const openOperationModal = useCallback((nextPosition: OperationPosition) => {
    setPosition(nextPosition);
    setModalMode('choose');
  }, []);

  const workflow = workflowsQuery.data?.workflows.find((item) => item.id === workflowId);

  return (
    <main className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-white/15 bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link to="/dashboard" className="text-lg font-bold tracking-[0.06em] text-text">
          s4p
        </Link>

        <button
          type="button"
          aria-label="Back"
          className="rounded-full border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
          onClick={() => navigate('/dashboard')}
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">{workflow?.name ?? 'Workflow'}</h1>
      </header>
      <div className="relative h-[calc(100vh-77px)] min-h-96">
        {operationsQuery.isLoading ? <p className="p-6 text-secondary">Loading operations...</p> :
          operationsQuery.isError ? <p className="p-6 text-red-400">Unable to load operations.</p> : (
            <>
              <OperationsCanvas operations={operationsQuery.data ?? []} onAdd={openOperationModal} />
              {operationsQuery.data?.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Button type="button" className="pointer-events-auto" onClick={() => { setPosition(undefined); setModalMode('trigger'); }}>+ Add a trigger</Button>
                </div>
              ) : null}
            </>
          )}
      </div>
      {modalMode && workflowId ? <OperationModal key={`${workflowId}-${modalMode}`} workflowId={workflowId} position={position} triggerOnly={modalMode === 'trigger'} onClose={() => setModalMode(null)} /> : null}
    </main>
  );
}
