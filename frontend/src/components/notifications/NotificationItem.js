'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

/**
 * Maps a notification's entity_type to where clicking it should go.
 * Task/issue open their existing drawer-based detail view via the
 * ?open= query param (see app/tasks/page.js and app/issues/page.js);
 * project/workspace go to their detail pages; a conversation mention
 * goes to the DM inbox — group-chat mentions can't deep-link to the
 * exact workspace/project tab from just a conversationId alone, a
 * disclosed, minor limitation rather than over-built resolution logic
 * for a single notification type. File notifications link to the
 * owning task/issue instead of a bare file id, since there's no
 * standalone file detail page.
 */
function resolveHref(notification) {
  const { entity_type: type, entity_id: id, metadata } = notification;
  switch (type) {
    case 'task':
      return `/tasks?open=${id}`;
    case 'issue':
      return `/issues?open=${id}`;
    case 'project':
      return `/projects/${id}`;
    case 'workspace':
      return `/workspaces/${id}`;
    case 'conversation':
      return '/chat';
    case 'file':
      return metadata?.taskId ? `/tasks?open=${metadata.taskId}` : metadata?.issueId ? `/issues?open=${metadata.issueId}` : null;
    default:
      return null;
  }
}

export default function NotificationItem({ notification, onRead, onDelete, compact = false }) {
  const href = resolveHref(notification);
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
  };

  const content = (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 ${isUnread ? 'bg-brand-tint/30' : ''} ${
        href ? 'cursor-pointer hover:bg-ink/[0.03]' : ''
      }`}
      onClick={handleClick}
    >
      <div className="relative shrink-0">
        <Avatar name={notification.actor_name || 'System'} src={notification.actor_avatar} size={compact ? 30 : 34} />
        {isUnread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-surface" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isUnread ? 'font-medium text-ink' : 'text-ink/80'}`}>{notification.title}</p>
        {notification.message && <p className="mt-0.5 truncate text-xs text-muted">{notification.message}</p>}
        <p className="mt-1 text-[11px] text-muted">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(notification.id); }}
          className="shrink-0 rounded-md p-1 text-muted opacity-0 hover:bg-danger-tint hover:text-danger group-hover:opacity-100"
          aria-label="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    );
  }
  return <div className="group">{content}</div>;
}
