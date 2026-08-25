import { cn } from '@/lib/utils';

const STYLES = {
  open: 'bg-signal-tint text-signal',
  in_progress: 'bg-brand-tint text-brand-strong',
  resolved: 'bg-ink/5 text-muted',
  closed: 'bg-ink/10 text-ink',
  reopened: 'bg-danger-tint text-danger',
};

const LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

export default function IssueStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[status] || STYLES.open,
        className
      )}
    >
      {LABELS[status] || status}
    </span>
  );
}
