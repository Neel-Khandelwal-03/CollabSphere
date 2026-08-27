'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import NotificationItem from './NotificationItem';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useLiveNotifications,
} from '@/hooks/useNotifications';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  useLiveNotifications();

  const { data: count } = useUnreadNotificationCount();
  const { data: notifications, isLoading } = useNotifications({ limit: 8 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-ink hover:bg-ink/5"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {!!count && count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-lg sm:w-96">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">Notifications</p>
              {!!count && count > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && <p className="p-4 text-center text-sm text-muted">Loading...</p>}
              {!isLoading && notifications?.length === 0 && (
                <p className="p-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
              )}
              {notifications?.map((n) => (
                <div key={n.id} onClick={() => setOpen(false)}>
                  <NotificationItem notification={n} onRead={(id) => markRead.mutate(id)} compact />
                </div>
              ))}
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-line px-3.5 py-2.5 text-center text-sm text-brand hover:bg-ink/[0.02]"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
