type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-secondary">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        {...props}
        className={[
          'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-text placeholder-secondary/50',
          'outline-none transition',
          'focus:border-primary/60 focus:ring-1 focus:ring-primary/40',
          error ? 'border-red-500/60' : '',
          className,
        ].join(' ')}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
