type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <label className="mb-4 block">
      <span className="sr-only">Search list</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-text placeholder-secondary/50 outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
      />
    </label>
  );
}
