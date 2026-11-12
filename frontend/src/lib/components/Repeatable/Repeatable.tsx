import type { Key, ReactNode } from 'react';
import { Button } from '../Button/Button';

type RepeatableProps<T> = {
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  children: (item: T, onChange: (item: T) => void, index: number, deleteButton: ReactNode) => ReactNode;
  minItems?: number;
  maxItems?: number;
  disabled?: boolean;
  addLabel?: string;
  itemLabel?: string;
  getItemKey?: (item: T, index: number) => Key;
};

// Wrap any editor or group of components to give it Add/Delete controls.
export function Repeatable<T>({ items, onChange, createItem, children, minItems = 0, maxItems,
  disabled = false, addLabel = '+ Add', itemLabel = 'item', getItemKey }: RepeatableProps<T>) {
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
      {items.map((item, index) => (
        <div key={getItemKey?.(item, index) ?? index} className="min-w-0">
          {children(item, (next) => onChange(items.map((current, i) => i === index ? next : current)), index,
          <Button type="button" variant="danger" size="sm" aria-label={`Delete ${itemLabel} ${index + 1}`}
            className="shrink-0 !px-3 !py-1 !text-xs"
            disabled={items.length <= minItems}
            onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</Button>)}
        </div>
      ))}
      <button type="button" className="self-start rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40"
        disabled={maxItems !== undefined && items.length >= maxItems}
        onClick={() => onChange([...items, createItem()])}>{addLabel}</button>
    </fieldset>
  );
}
