import { cn } from '@/lib/utils';

const PRIORITY_STYLES = {
  low: 'bg-ink/5 text-muted',
  medium: 'bg-brand-tint text-brand-strong',
  high: 'bg-signal-tint text-signal',
  critical: 'bg-danger-tint text-danger',
};

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export default function PriorityBadge({ priority, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium,
        className
      )}
    >
      {priority === 'critical' && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}
