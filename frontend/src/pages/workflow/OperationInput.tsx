import { createContext, useContext, useEffect, useRef, useState, type InputHTMLAttributes, type ChangeEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { HTTPError } from 'ky';
import api from '../../lib/api/api';
import { Textarea } from '../../lib/components/Textarea/Textarea';

export const OperationInputContext = createContext<{ workflowId: string; sourceId?: string } | null>(null);

type OutputPath = (string | number)[];

export function formatOperationReference(operationId: string, path: OutputPath): string {
  const fields = path.map((key) => typeof key === 'number' ? `[${key}]`
    : /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`).join('');
  return `\${[${operationId}]${fields}}`;
}

function OutputFields({ output, path = [], onSelect }: { output: unknown; path?: OutputPath; onSelect: (path: OutputPath) => void }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  if (output === null || typeof output !== 'object') {
    return <p className="p-2 text-xs text-secondary">{output === null ? 'No output data available.' : 'No fields available.'}</p>;
  }
  const entries = Object.entries(output);
  if (!entries.length) return <p className="p-2 text-xs text-secondary">No fields available.</p>;
  return <div className="flex flex-col gap-1">
    {entries.map(([key, value]) => {
      const fieldPath = [...path, Array.isArray(output) ? Number(key) : key];
      const nested = value !== null && typeof value === 'object';
      return <div key={key}>
        <div className="flex items-center gap-1">
          <button type="button" className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/10"
            onClick={() => onSelect(fieldPath)}>
            <span className="block break-all font-medium">{key}</span>
            {!nested && <span className="block truncate text-secondary">{String(value)}</span>}
          </button>
          {nested && <button type="button" aria-label={`Expand ${key}`} aria-expanded={expanded.includes(key)}
            className="rounded-md px-2 py-1 hover:bg-white/10"
            onClick={() => setExpanded((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])}>
            {expanded.includes(key) ? '−' : '+'}
          </button>}
        </div>
        {nested && expanded.includes(key) && <div className="ml-3 border-l border-white/15 pl-2">
          <OutputFields output={value} path={fieldPath} onSelect={onSelect} />
        </div>}
      </div>;
    })}
  </div>;
}

// A text input with an output picker; reference tokens remain editable plain text.
export function OperationInput({ value, onValueChange, multiline = false, ...props }: Pick<InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className' | 'required' | 'minLength' | 'maxLength' | 'placeholder' | 'disabled' | 'aria-describedby'> & {
  value: string; multiline?: boolean; onValueChange: (value: string) => void;
}) {
  const context = useContext(OperationInputContext);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<{ id: string; ui_name: string } | null>(null);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const open = anchor !== null;
  const operationsQuery = useQuery({
    queryKey: ['reference-operations', context?.workflowId, context?.sourceId],
    enabled: open && !!context?.sourceId,
    staleTime: 0,
    queryFn: () => api.get(`workflows/${context!.workflowId}/reference-operations`, {
      searchParams: { sourceId: context!.sourceId! },
    }).json<{ operations: { id: string; ui_name: string }[] }>(),
  });
  const preview = useMutation({
    mutationFn: (operationId: string) => api.post(`workflows/${context!.workflowId}/operations/${operationId}/execute`, {
      json: { sourceId: context!.sourceId },
    }).json<{ output: unknown; expiresAt: number }>(),
  });

  const close = () => { setAnchor(null); requestVersion.current++; };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) { setAnchor(null); requestVersion.current++; }
    };
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('pointerdown', outside); requestVersion.current++; };
  }, [open]);

  const chooseOperation = async (operation: { id: string; ui_name: string }) => {
    const version = ++requestVersion.current;
    setSelectedOperation(operation);
    setError('');
    try { await preview.mutateAsync(operation.id); }
    catch (cause) {
      if (requestVersion.current !== version) return;
      const body = cause instanceof HTTPError ? await cause.response.json().catch(() => null) as { error?: string } | null : null;
      setError(body?.error ?? 'Unable to load output data.');
    }
  };

  const insert = (path: OutputPath) => {
    if (anchor === null || !selectedOperation) return;
    const token = formatOperationReference(selectedOperation.id, path);
    onValueChange(value.slice(0, anchor) + token + value.slice(anchor + 1));
    const caret = anchor + token.length;
    close();
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(caret, caret); });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (open && (event.key === 'Escape' || event.key === 'Enter')) {
      event.preventDefault(); event.stopPropagation(); if (event.key === 'Escape') close();
    }
  };
  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = event.target.value;
    const cursor = event.target.selectionStart ?? next.length;
    onValueChange(next);
    if (next[cursor - 1] === '\\') {
      requestVersion.current++;
      setAnchor(cursor - 1); setSelectedOperation(null); setError(''); preview.reset();
    } else close();
  };
  const fieldProps = { ...props, value, onChange, onKeyDown,
    'aria-expanded': open, 'aria-controls': open ? `${props.id}-output-picker` : undefined };

  return <div ref={containerRef} className="relative min-w-0">
    {multiline
      ? <Textarea {...fieldProps} ref={(element) => { inputRef.current = element; }} />
      : <input {...fieldProps} ref={(element) => { inputRef.current = element; }} type="text" />}
    {open && <div id={`${props.id}-output-picker`} role="region" aria-label="Output data"
      className="relative z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/20 bg-[#1A1129] p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Output Data</span>
        <button type="button" aria-label="Close output picker" className="px-2 text-sm" onClick={close}>×</button>
      </div>
      {!selectedOperation ? !context?.sourceId ? <p className="text-xs text-secondary">No preceding operations.</p>
        : operationsQuery.isPending ? <p className="text-xs text-secondary">Loading operations...</p>
        : operationsQuery.isError ? <p role="alert" className="text-xs text-red-400">Unable to load operations.</p>
        : !operationsQuery.data.operations.length ? <p className="text-xs text-secondary">No preceding readonly operations.</p>
        : operationsQuery.data.operations.map((operation) => <button key={operation.id} type="button"
          className="mb-1 flex w-full items-center justify-between rounded-lg border border-white/15 px-3 py-2 text-left text-xs hover:bg-white/5"
          onClick={() => void chooseOperation(operation)}><span>{operation.ui_name}</span><span>›</span></button>)
        : <>
          <button type="button" className="mb-2 text-xs text-secondary hover:text-text"
            onClick={() => { requestVersion.current++; setSelectedOperation(null); setError(''); preview.reset(); }}>← Operations</button>
          <p className="mb-2 text-xs font-semibold">{selectedOperation.ui_name}</p>
          {preview.isPending ? <p className="text-xs text-secondary">Loading output...</p>
            : error ? <p role="alert" className="text-xs text-red-400">{error}</p>
            : preview.isSuccess ? <OutputFields output={preview.data.output} onSelect={insert} /> : null}
        </>}
    </div>}
  </div>;
}
