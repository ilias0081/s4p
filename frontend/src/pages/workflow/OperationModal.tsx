import { useEffect, useRef, useState } from 'react';
import { Button } from '../../lib/components/Button/Button';
import { AppsList } from './AppsList';

const operationTypes = [
  { type: 'trigger', label: 'App Event', description: 'Wait for something to happen inside an app', icon: 'M13 2 4 14h7l-1 8 10-12h-7l1-8Z' },
  { type: 'data_trans', label: 'Data Transformation', description: 'Take the previous result and edit it so that the output is different', icon: 'M4 7h16M4 17h16M8 4v6m8 4v6' },
  { type: 'ai_data_trans', label: 'AI', description: 'Define a prompt to take the previous result and let AI create the output', icon: 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z' },
  { type: 'action_in_app', label: 'App Action', description: 'Take previous input data and perform an operation inside a connected app', icon: 'M4 4h16v16H4V4Zm4 8h8m-3-3 3 3-3 3' },
] as const;

type SelectableOperationType = typeof operationTypes[number]['type'];

export function OperationModal({ triggerOnly = false, onClose }: { triggerOnly?: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedType, setSelectedType] = useState<SelectableOperationType | null>(triggerOnly ? 'trigger' : null);
  const selected = operationTypes.find((operation) => operation.type === selectedType);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="operation-modal-title" onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-background p-0 text-text shadow-panel backdrop:bg-black/60">
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex items-center justify-between border-b border-white/15 px-6 py-4">
          <h2 id="operation-modal-title" className="text-lg font-semibold">Operation</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 py-1 text-secondary hover:bg-white/10 hover:text-text">✕</button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <aside aria-label="Operation types" className="flex shrink-0 flex-col gap-2 border-b border-white/15 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-[300px] md:overflow-y-auto md:border-b-0 md:border-r">
            {operationTypes.map((operation) => (
              <button key={operation.type} type="button" disabled={triggerOnly} aria-pressed={selectedType === operation.type}
                onClick={() => setSelectedType(operation.type)}
                className={`flex w-full gap-3 rounded-xl border p-4 text-left transition disabled:cursor-default ${selectedType === operation.type ? 'border-primary bg-primary/20' : 'border-transparent hover:border-white/15 hover:bg-white/5'} ${triggerOnly && operation.type !== 'trigger' ? 'opacity-40' : ''}`}>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={operation.icon} /></svg>
                </span>
                <span><span className="block text-sm font-semibold">{operation.label}</span><span className="mt-1 block text-xs leading-relaxed text-secondary">{operation.description}</span></span>
              </button>
            ))}
          </aside>
          <section aria-live="polite" className="min-h-[320px] min-w-0 flex-1 p-6 md:h-[460px] md:overflow-y-auto">
            {!selected ? <div className="flex h-full min-h-[240px] items-center justify-center text-center text-secondary">Choose an operation type from the left-hand panel</div> : (
              <>
                <h3 className="mb-2 text-base font-semibold">{selected.label}</h3>
                <p className="mb-6 text-sm text-secondary">{selected.description}</p>
                {selectedType === 'trigger' || selectedType === 'action_in_app' ? <AppsList key={selectedType} /> : (
                  <p className="text-sm text-secondary">Configuration for this operation type is coming soon.</p>
                )}
              </>
            )}
          </section>
        </div>
        <footer className="flex justify-end gap-3 border-t border-white/15 px-6 py-4">
          <Button type="button" variant="neutral" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled>Save</Button>
        </footer>
      </div>
    </dialog>
  );
}
