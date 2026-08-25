'use client';

import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <AppShell title="Settings">
      <p className="font-mono text-xs uppercase tracking-wider text-brand">Account</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
        Your profile
      </h2>

      <Card className="mt-6 max-w-xl p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} size={56} />
          <div>
            <p className="font-display text-base font-semibold text-ink">{user?.name}</p>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Member since</dt>
            <dd className="text-ink">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-xs text-muted">
          Profile editing, avatar upload, and password change land with the User Profile module.
        </p>
      </Card>
    </AppShell>
  );
}
