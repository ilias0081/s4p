import { Link, useNavigate, useParams } from 'react-router-dom';

import { useWorkflows } from '../dashboard/workflows';

export function WorkflowPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const workflowsQuery = useWorkflows();

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
    </main>
  );
}
