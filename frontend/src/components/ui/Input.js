import { cn } from '@/lib/utils';

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-ink', className)}
      {...props}
    />
  );
}

export function Input({ className, error, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70',
        'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand/40',
        error ? 'border-danger focus:border-danger' : 'border-line focus:border-brand',
        className
      )}
      {...props}
    />
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-danger">{children}</p>;
}
