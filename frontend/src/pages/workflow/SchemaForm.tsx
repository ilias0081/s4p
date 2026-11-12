import { useId, useState, type ReactNode } from 'react';
import { OperationInput, OperationInputContext } from './OperationInput';
import { Repeatable } from '../../lib/components/Repeatable/Repeatable';

// The backend converts each Zod input schema to JSON Schema for the browser.
export type InputSchema = {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  properties?: Record<string, InputSchema>;
  required?: string[];
  items?: InputSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  format?: string;
  multiline?: boolean;
};

export function getInitialValue(schema: InputSchema): unknown {
  if (schema.default !== undefined) return structuredClone(schema.default);
  if (schema.type === 'object') {
    return Object.fromEntries(Object.entries(schema.properties ?? {})
      .filter(([key, field]) => schema.required?.includes(key) || field.default !== undefined)
      .map(([key, field]) => [key, getInitialValue(field)]));
  }
  if (schema.type === 'array') {
    return Array.from({ length: schema.minItems ?? 0 }, () => getInitialValue(schema.items ?? {}));
  }
  if (schema.type === 'boolean') return false;
  return '';
}

const inputClass = 'w-full rounded-lg border border-white/20 bg-[#1A1129] px-3 py-2 text-sm text-text';

function SchemaField({ label, schema, value, required = false, onChange, action }: {
  label: string; schema: InputSchema; value: unknown; required?: boolean; onChange: (value: unknown) => void; action?: ReactNode;
}) {
  const id = useId();
  const description = schema.description ? <p id={`${id}-description`} className="text-xs text-secondary">{schema.description}</p> : null;

  if (schema.type === 'object') {
    const object = (value ?? {}) as Record<string, unknown>;
    return (
      <fieldset className="flex min-w-0 flex-col gap-3 border-l border-white/15 pl-4">
        <legend className="mb-2 text-sm font-semibold">{label}</legend>
        {action}
        {description}
        {Object.entries(schema.properties ?? {}).map(([key, field]) => (
          <SchemaField key={key} label={key} schema={field} value={object[key]} required={schema.required?.includes(key)}
            onChange={(next) => onChange({ ...object, [key]: next })} />
        ))}
      </fieldset>
    );
  }

  if (schema.type === 'array') {
    const items = (value ?? []) as unknown[];
    return (
      <fieldset className="flex min-w-0 flex-col gap-3 border-l border-white/15 pl-4">
        <legend className="mb-2 text-sm font-semibold">{label}{required ? ' *' : ''}</legend>
        {action}
        {description}
        <Repeatable items={items} onChange={onChange} createItem={() => getInitialValue(schema.items ?? {})}
          minItems={schema.minItems} maxItems={schema.maxItems} addLabel={`+ Add ${label}`} itemLabel={label}>
          {(item, updateItem, index, deleteButton) => (
            <SchemaField label={`${label} ${index + 1}`} schema={schema.items ?? {}} value={item} required onChange={updateItem} action={deleteButton} />
          )}
        </Repeatable>
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}{required ? ' *' : ''}</label>
      {description}
      {schema.enum ? (
        <select id={id} className={inputClass} value={String(value ?? '')} required={required}
          onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose {label}</option>
          {schema.enum.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : schema.type === 'boolean' ? (
        <input id={id} type="checkbox" className="h-4 w-4 accent-primary" checked={value === true}
          onChange={(event) => onChange(event.target.checked)} />
      ) : schema.type === 'string' ? (
        <OperationInput id={id} className={inputClass} aria-describedby={description ? `${id}-description` : undefined}
          multiline={schema.multiline}
          action={action}
          value={typeof value === 'string' ? value : ''} required={required} minLength={schema.minLength} maxLength={schema.maxLength}
          onValueChange={onChange} />
      ) : (
        <input id={id} className={inputClass} aria-describedby={description ? `${id}-description` : undefined}
          type={schema.type === 'number' || schema.type === 'integer' ? 'number' : schema.format === 'email' ? 'email' : 'text'}
          value={typeof value === 'string' || typeof value === 'number' ? value : ''} required={required}
          minLength={schema.minLength} maxLength={schema.maxLength} min={schema.minimum} max={schema.maximum}
          step={schema.type === 'integer' ? 1 : 'any'}
          onChange={(event) => onChange(event.target.type === 'number' && event.target.value !== ''
            ? event.target.valueAsNumber : event.target.value)} />
      )}
      {schema.type !== 'string' || schema.enum ? action : null}
    </div>
  );
}

export function SchemaForm({ id, schema, disabled, onSubmit, workflowId, sourceId, initialValue }: {
  id: string; 
  schema: InputSchema; 
  disabled: boolean; 
  workflowId: string; 
  sourceId?: string;
  initialValue?: Record<string, unknown>;
  onSubmit: (configuration: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState(() => initialValue ? structuredClone(initialValue)
    : getInitialValue(schema) as Record<string, unknown>);
  return (
    <OperationInputContext.Provider value={{ workflowId, sourceId }}>
    <form id={id} onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit(value); }}>
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4 disabled:opacity-60">
        {Object.keys(schema.properties ?? {}).length ? Object.entries(schema.properties ?? {}).map(([key, field]) => (
          <SchemaField key={key} label={key} schema={field} value={value[key]} required={schema.required?.includes(key)}
            onChange={(next) => setValue((current) => ({ ...current, [key]: next }))} />
        )) : <p className="text-sm text-secondary">This method has no input fields.</p>}
      </fieldset>
    </form>
    </OperationInputContext.Provider>
  );
}
