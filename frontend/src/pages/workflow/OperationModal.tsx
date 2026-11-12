import { useEffect, useRef, useState } from 'react';
import { Button } from '../../lib/components/Button/Button';
import { AppsList, useApps } from './AppsList';
import { List, ListItem } from '../../lib/components/List/List';
import { useAppMethods, useAppMethodInputSchema, useSaveOperation, type OperationPosition, type Operation } from './operations';
import { SchemaForm } from './SchemaForm';
import { HTTPError } from 'ky';

const operationTypes = [
  { type: 'trigger', label: 'App Event', description: 'Wait for something to happen inside an app', icon: 'M13 2 4 14h7l-1 8 10-12h-7l1-8Z' },
  { type: 'data_trans', label: 'Data Transformation', description: 'Take the previous result and edit it so that the output is different', icon: 'M4 7h16M4 17h16M8 4v6m8 4v6' },
  { type: 'ai_data_trans', label: 'AI', description: 'Define a prompt to take the previous result and let AI create the output', icon: 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z' },
  { type: 'action_in_app', label: 'App Action', description: 'Take previous input data and perform an operation inside a connected app', icon: 'M4 4h16v16H4V4Zm4 8h8m-3-3 3 3-3 3' },
] as const;

type SelectableOperationType = typeof operationTypes[number]['type'];

export function OperationModal({ workflowId, position, operation, triggerOnly = false, onClose }: {
  workflowId: string; position?: OperationPosition; operation?: Operation; triggerOnly?: boolean; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedType, setSelectedType] = useState<SelectableOperationType | null>(operation
    ? operationTypes.find((item) => item.type === operation.type)?.type ?? null : triggerOnly ? 'trigger' : null);
  const selected = operationTypes.find((operation) => operation.type === selectedType);
  const [selectedAppId, setSelectedApp] = useState<string | null>(operation ? operation.appId : null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(operation ? operation.method : null);
  const appsQuery = useApps();
  const selectedApp = appsQuery.data?.apps.find((app) => app.id === selectedAppId)
    ?? (selectedAppId ? { id: selectedAppId, ui_name: 'Loading app...' } : null);
  const [error, setError] = useState('');
  const appType = selectedType === 'trigger' || selectedType === 'action_in_app' ? selectedType : null;
  const methodsQuery = useAppMethods(selectedApp?.id, appType);
  const schemaQuery = useAppMethodInputSchema(selectedApp?.id, selectedMethod);
  const saveMutation = useSaveOperation(workflowId, operation?.id);
  const sourceId = operation ? operation.previous?.id : position?.sourceId;
  const close = () => { if (!saveMutation.isPending) onClose(); };
  const isTypeDisabled = (type: SelectableOperationType) => {
    if (saveMutation.isPending) return true;
    if (triggerOnly) return type !== 'trigger';
    return type === 'trigger' && sourceId !== undefined;
  };

  const save = async (configuration: Record<string, unknown>) => {
    if (!selectedApp || !selectedMethod || !appType || saveMutation.isPending) return;
    setError('');
    try {
      await saveMutation.mutateAsync({ appId: selectedApp.id, method: selectedMethod, type: appType, position, configuration });
      onClose();
    } catch (saveError) {
      const body = saveError instanceof HTTPError
        ? await saveError.response.json().catch(() => null) as { error?: string; issues?: { path: (string | number)[]; message: string }[] } | null : null;
      setError(body?.issues?.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · ')
        || body?.error || 'Unable to save operation. Please try again.');
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="operation-modal-title" onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-background p-0 text-text shadow-panel backdrop:bg-black/60">
      <div className="flex h-[94dvh] flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-white/15 px-6 py-4">
          <h2 id="operation-modal-title" className="text-lg font-semibold">{operation ? 'Edit operation' : 'Operation'}</h2>
          <button type="button" onClick={close} disabled={saveMutation.isPending} aria-label="Close" className="rounded-full px-2 py-1 text-secondary hover:bg-white/10 hover:text-text">✕</button>
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside aria-label="Operation types" className="flex h-full min-h-0 w-2/5 shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain border-r border-white/15 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-[300px]">
            {operationTypes.map((operation) => (
              <button key={operation.type} type="button" disabled={isTypeDisabled(operation.type)} aria-pressed={selectedType === operation.type}
                onClick={() => { 
                  setSelectedType(operation.type); 
                  setSelectedApp(null); 
                  setSelectedMethod(null); 
                  setError(''); 
                }}
                className={`flex w-full shrink-0 gap-3 rounded-xl border p-4 text-left transition disabled:cursor-default disabled:opacity-40 ${selectedType === operation.type ? 'border-primary bg-primary/20' : 'border-transparent enabled:hover:border-white/15 enabled:hover:bg-white/5'}`}>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={operation.icon} /></svg>
                </span>
                <span><span className="block text-sm font-semibold">{operation.label}</span><span className="mt-1 block text-xs leading-relaxed text-secondary">{operation.description}</span></span>
              </button>
            ))}
          </aside>
          <section aria-live="polite" className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-6">
            {!selected ? <div className="flex h-full min-h-[240px] items-center justify-center text-center text-secondary">Choose an operation type from the left-hand panel</div> : (
              <>
                <h3 className="mb-2 text-base font-semibold">{selected.label}</h3>
                <p className="mb-6 text-sm text-secondary">{selected.description}</p>
                {appType ? selectedApp ? (
                  <div>
                    <Button type="button" size="sm" variant="neutral" disabled={saveMutation.isPending}
                      onClick={() => { setSelectedApp(null); setSelectedMethod(null); setError(''); }}>← {selectedApp.ui_name} · Change app</Button>
                    {selectedMethod ? (
                      <div className="mt-5">
                        <Button type="button" size="sm" variant="neutral" disabled={saveMutation.isPending}
                          onClick={() => { setSelectedMethod(null); setError(''); }}>Change method</Button>
                        <h4 className="mb-4 mt-4 text-sm font-semibold">
                          {methodsQuery.data?.methods.find((method) => method.method === selectedMethod)?.ui_name} configuration
                        </h4>
                        {schemaQuery.isPending ? <p className="text-sm text-secondary">Loading configuration...</p> :
                          schemaQuery.isError ? <p role="alert" className="text-sm text-red-400">Unable to load configuration.
                            <button type="button" className="ml-2 underline" onClick={() => void schemaQuery.refetch()}>Retry</button>
                          </p> : (
                            <SchemaForm key={`${selectedApp.id}-${selectedMethod}`} id="operation-configuration" schema={schemaQuery.data.schema}
                              workflowId={workflowId} sourceId={sourceId}
                              initialValue={operation?.appId === selectedApp.id && operation.method === selectedMethod
                                ? operation.configuration as Record<string, unknown> : undefined}
                              disabled={saveMutation.isPending} onSubmit={(configuration) => void save(configuration)} />
                          )}
                      </div>
                    ) : <>
                    <h4 className="mb-3 mt-5 text-sm font-semibold">Choose a method</h4>
                    {methodsQuery.isPending ? <p className="text-sm text-secondary">Loading methods...</p> :
                      methodsQuery.isError ? <p className="text-sm text-red-400">Unable to load methods for this app.</p> :
                      !methodsQuery.data.methods.length ? <p className="text-sm text-secondary">No methods available for this operation type.</p> : (
                        <List id="app-methods">
                          {methodsQuery.data.methods.map((method) => (
                            <ListItem key={method.method} className={selectedMethod === method.method ? '!border-primary !bg-primary/20 !p-0' : '!p-0'}>
                              <button type="button" disabled={saveMutation.isPending} aria-pressed={selectedMethod === method.method}
                                className="w-full p-3 text-left" onClick={() => { setSelectedMethod(method.method); setError(''); }}>
                                <span className="block text-sm font-semibold">{method.ui_name}</span>
                                <span className="mt-1 block text-xs text-secondary">{method.description}</span>
                              </button>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </>}
                  </div>
                ) : <AppsList key={selectedType} onSelect={(app) => { setSelectedApp(app.id); setSelectedMethod(null); setError(''); }} /> : (
                  <p className="text-sm text-secondary">Configuration for this operation type is coming soon.</p>
                )}
              </>
            )}
          </section>
        </div>
        <footer className="shrink-0 border-t border-white/15 px-6 py-4">
          {error ? <p role="alert" className="mb-3 text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-3">
          <Button type="button" variant="neutral" disabled={saveMutation.isPending} onClick={close}>Cancel</Button>
          <Button type="submit" form="operation-configuration" disabled={!selectedMethod || !appType || !schemaQuery.isSuccess || saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
