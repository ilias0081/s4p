import { useEffect, useRef, useState } from 'react';
import { HTTPError } from 'ky';
import { useDeleteOperation } from './operations';

export function OperationNodeMenu({ workflowId, operationId, canDelete, onEdit }: {
  workflowId: string; operationId: string; canDelete: boolean; onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const deleteMutation = useDeleteOperation(workflowId);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const remove = async () => {
    if (!canDelete || deleteMutation.isPending) return;
    setError('');
    try {
      await deleteMutation.mutateAsync(operationId);
      setOpen(false);
    } catch (cause) {
      const body = cause instanceof HTTPError
        ? await cause.response.json().catch(() => null) as { error?: string } | null : null;
      setError(body?.error ?? 'Unable to delete operation. Please try again.');
    }
  };

  return (
    <div ref={containerRef} className="nodrag nopan relative shrink-0 text-left">
      <button ref={buttonRef} type="button" aria-label="Operation options" aria-expanded={open}
        className="flex h-5 w-4 items-center justify-center rounded-md hover:bg-white/10"
        onClick={() => setOpen(!open)}>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="8" cy="13" r="1.3" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-full top-0 z-50 ml-2 w-24 rounded-lg border border-white/15 bg-[#1A1129] p-0.5 shadow-lg">
          <button type="button" disabled={deleteMutation.isPending} onClick={() => { setOpen(false); onEdit(); }}
            className="block w-full rounded-md px-2 py-1 text-left text-xs enabled:hover:bg-white/5 disabled:opacity-40">Edit</button>
          <button type="button" disabled={!canDelete || deleteMutation.isPending} onClick={() => void remove()}
            className="block w-full rounded-md px-2 py-1 text-left text-xs text-red-400 enabled:hover:bg-white/5 disabled:cursor-default disabled:opacity-40">
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
          {error ? <p role="alert" className="px-2 py-1 text-xs text-red-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
