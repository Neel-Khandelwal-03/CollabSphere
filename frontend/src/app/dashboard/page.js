'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Boxes, CheckSquare, FolderKanban, ArrowRight, AlertCircle,
  Bell, FileText, CheckCircle2, Clock,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import StatCard from '@/components/analytics/StatCard';
import { describeActivity } from '@/components/activity/describeActivity';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardAnalytics } from '@/hooks/useAnalytics';
import ErrorState from '@/components/ui/ErrorState';

const DEADLINE_LABELS = { overdue: 'Overdue', today: 'Due today', tomorrow: 'Due tomorrow', this_week: 'Due this week' };
const DEADLINE_STYLES = {
  overdue: 'text-danger',
  today: 'text-brand-strong',
  tomorrow: 'text-ink',
  this_week: 'text-muted',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: projects, isLoading: projectsLoading } = useProjects({ sort: 'newest' });
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch: refetchAnalytics } = useDashboardAnalytics();

  const stats = [
    { label: 'Workspaces', value: analytics?.totalWorkspaces, icon: Boxes },
    { label: 'Projects', value: analytics?.totalProjects, icon: FolderKanban },
    { label: 'Tasks', value: analytics?.totalTasks, icon: CheckSquare },
    { label: 'Tasks completed', value: analytics?.completedTasks, icon: CheckCircle2 },
    { label: 'Open issues', value: analytics?.openIssues, icon: AlertCircle },
    { label: 'Issues resolved', value: analytics?.resolvedIssues, icon: CheckCircle2 },
    { label: 'Unread notifications', value: analytics?.unreadNotifications, icon: Bell },
    { label: 'Files uploaded', value: analytics?.filesUploaded, icon: FileText },
  ];

  return (
    <AppShell title="Dashboard">
      <p className="font-mono text-xs uppercase tracking-wider text-brand">Overview</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
        Welcome back, {user?.name?.split(' ')[0]}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Here&apos;s what&apos;s happening across your workspaces.
      </p>

      {analyticsError ? (
        <ErrorState message="Unable to load your stats." onRetry={refetchAnalytics} className="mt-8" />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon }) => (
            <StatCard key={label} label={label} value={value} icon={icon} loading={analyticsLoading} />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-brand" />
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Upcoming deadlines</p>
          </div>
          <div className="mt-3 space-y-2.5">
            {analyticsLoading && <p className="text-sm text-muted">Loading...</p>}
            {!analyticsLoading && (!analytics?.upcomingDeadlines || analytics.upcomingDeadlines.length === 0) && (
              <p className="py-4 text-center text-sm text-muted">Nothing due in the next 7 days.</p>
            )}
            {analytics?.upcomingDeadlines?.map((d) => (
              <Link key={`${d.type}-${d.id}`} href={d.href} className="flex items-center justify-between gap-2 hover:opacity-80">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{d.title}</p>
                  <p className="truncate text-xs text-muted">{d.context}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${DEADLINE_STYLES[d.bucket]}`}>
                  {DEADLINE_LABELS[d.bucket]}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Recent activity</p>
          <div className="mt-3 space-y-2.5">
            {analyticsLoading && <p className="text-sm text-muted">Loading...</p>}
            {!analyticsLoading && (!analytics?.recentActivity || analytics.recentActivity.length === 0) && (
              <p className="py-4 text-center text-sm text-muted">No activity yet.</p>
            )}
            {analytics?.recentActivity?.slice(0, 6).map((a) => (
              <div key={a.id}>
                <p className="text-sm text-ink">{describeActivity(a)}</p>
                <p className="text-xs text-muted">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {a.workspace_name}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Recent projects</p>
        <Link href="/projects" className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectsLoading && <Card className="p-5 text-sm text-muted">Loading projects...</Card>}

        {!projectsLoading && projects?.length === 0 && (
          <Card className="p-6 sm:col-span-2 lg:col-span-3">
            <p className="text-sm text-muted">No projects yet.</p>
            <Button as={Link} href="/projects" variant="primary" className="mt-4">
              Create your first project
            </Button>
          </Card>
        )}

        {projects?.slice(0, 3).map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-base font-semibold text-ink">{p.name}</p>
                <PriorityBadge priority={p.priority} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {p.description || 'No description yet.'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="text-xs text-muted">· {p.workspace_name}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Your workspaces</p>
        <Link href="/workspaces" className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspacesLoading && <Card className="p-5 text-sm text-muted">Loading workspaces...</Card>}

        {!workspacesLoading && workspaces?.length === 0 && (
          <Card className="p-6 sm:col-span-2 lg:col-span-3">
            <p className="text-sm text-muted">
              You&apos;re not part of any workspace yet.
            </p>
            <Button as={Link} href="/workspaces" variant="primary" className="mt-4">
              Create your first workspace
            </Button>
          </Card>
        )}

        {workspaces?.slice(0, 3).map((ws) => (
          <Link key={ws.id} href={`/workspaces/${ws.id}`}>
            <Card className="p-5 transition-shadow hover:shadow-md">
              <p className="font-display text-base font-semibold text-ink">{ws.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {ws.description || 'No description yet.'}
              </p>
              <p className="mt-3 font-mono text-xs text-muted">
                {ws.member_count} member{ws.member_count === 1 ? '' : 's'}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
