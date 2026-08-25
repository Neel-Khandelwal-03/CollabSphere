import { cn } from '@/lib/utils';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-strong disabled:bg-brand/50',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 disabled:text-muted',
  outline: 'bg-surface text-ink border border-line hover:border-brand disabled:opacity-50',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  className,
  loading = false,
  children,
  disabled,
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </Component>
  );
}
