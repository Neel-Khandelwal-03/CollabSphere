import { cn } from '@/lib/utils';

const ROLE_STYLES = {
  owner: 'bg-brand-tint text-brand-strong',
  admin: 'bg-signal-tint text-signal',
  member: 'bg-ink/5 text-ink',
  viewer: 'bg-ink/5 text-muted',
};

export default function RoleBadge({ role, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide',
        ROLE_STYLES[role] || ROLE_STYLES.member,
        className
      )}
    >
      {role}
    </span>
  );
}
