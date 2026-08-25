import Avatar from './Avatar';
import { cn } from '@/lib/utils';

export default function AvatarStack({ members = [], total, size = 26, max = 4, className }) {
  const shown = members.slice(0, max);
  const overflow = (total ?? members.length) - shown.length;

  if (shown.length === 0) {
    return <span className="text-xs text-muted">No members assigned</span>;
  }

  return (
    <div className={cn('flex items-center', className)}>
      {shown.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }} className="relative">
          <Avatar
            name={m.name}
            src={m.avatar_url}
            size={size}
            className="ring-2 ring-surface"
          />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{ marginLeft: -8, width: size, height: size, fontSize: size * 0.34 }}
          className="relative z-0 flex items-center justify-center rounded-full bg-ink/10 font-medium text-muted ring-2 ring-surface"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
