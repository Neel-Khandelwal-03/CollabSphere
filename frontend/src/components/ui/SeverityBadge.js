import { cn } from '@/lib/utils';

const STYLES = {
  minor: 'bg-ink/5 text-muted',
  major: 'bg-brand-tint text-brand-strong',
  critical: 'bg-signal-tint text-signal',
  blocker: 'bg-danger-tint text-danger',
};

const LABELS = { minor: 'Minor', major: 'Major', critical: 'Critical', blocker: 'Blocker' };

export default function SeverityBadge({ severity, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[severity] || STYLES.minor,
        className
      )}
    >
      {severity === 'blocker' && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
      {LABELS[severity] || severity}
    </span>
  );
}
