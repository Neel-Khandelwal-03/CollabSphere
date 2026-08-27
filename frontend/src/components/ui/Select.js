import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink',
        'transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70',
        'transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40',
        className
      )}
      {...props}
    />
  );
});
