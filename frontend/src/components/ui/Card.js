import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface shadow-sm shadow-ink/[0.03]', className)}
      {...props}
    />
  );
}

export function Alert({ variant = 'danger', children, className }) {
  const styles = {
    danger: 'bg-danger-tint text-danger border-danger/20',
    success: 'bg-signal-tint text-signal border-signal/20',
    brand: 'bg-brand-tint text-brand-strong border-brand/20',
  };
  return (
    <div
      role="status"
      className={cn('rounded-lg border px-3.5 py-2.5 text-sm', styles[variant], className)}
    >
      {children}
    </div>
  );
}
