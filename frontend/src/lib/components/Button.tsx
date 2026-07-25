type ButtonVariant = 'primary' | 'neutral' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-primary/60 bg-primary text-text hover:brightness-110',
  neutral: 'border border-secondary/30 bg-secondary/15 text-secondary hover:bg-secondary/25 hover:text-text',
  danger:  'border border-red-500/60 bg-red-600/20 text-red-400 hover:bg-red-600/40 hover:text-text',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition',
        variantClasses[variant],
        sizeClasses[size],
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
