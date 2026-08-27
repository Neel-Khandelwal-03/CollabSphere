'use client';

import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import NotificationItem from '@/components/notifications/NotificationItem';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'task', label: 'Tasks' },
  { key: 'issue', label: 'Issues' },
  { key: 'project', label: 'Projects' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'conversation', label: 'Chat' },
  { key: 'file', label: 'Files' },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState('');

  const queryFilters = filter === 'unread' ? { unreadOnly: 'true' } : filter ? { entityType: filter } : {};
  const { data: notifications, isLoading } = useNotifications({ ...queryFilters, limit: 50 });
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  return (
    <AppShell title="Notifications">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand">
            <Bell className="h-3.5 w-3.5" />
            Everything that needs your attention
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Notifications</h2>
        </div>
        {!!unreadCount && unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === f.key ? 'bg-ink text-paper' : 'bg-ink/5 text-ink hover:bg-ink/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="mt-5 overflow-hidden">
        {isLoading && <p className="p-8 text-center text-sm text-muted">Loading...</p>}
        {!isLoading && notifications?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16">
            <Bell className="h-8 w-8 text-muted/50" />
            <p className="text-sm text-muted">Nothing here yet.</p>
          </div>
        )}
        <div className="divide-y divide-line">
          {notifications?.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={(id) => markRead.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
            />
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
