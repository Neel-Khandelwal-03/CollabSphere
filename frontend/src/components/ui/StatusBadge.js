import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  planning: 'bg-ink/5 text-muted',
  active: 'bg-signal-tint text-signal',
  on_hold: 'bg-danger-tint text-danger',
  completed: 'bg-brand-tint text-brand-strong',
  archived: 'bg-ink/5 text-muted',
};

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export default function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] || STATUS_STYLES.planning,
        className
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
