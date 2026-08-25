'use client';

import { useIsOnline } from '@/hooks/useSocket';

export default function PresenceDot({ workspaceId, userId, className = '' }) {
  const online = useIsOnline(workspaceId, userId);
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ring-2 ring-surface ${online ? 'bg-signal' : 'bg-ink/20'} ${className}`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
