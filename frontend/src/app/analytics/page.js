'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { BarChart3, Boxes, FolderKanban, CheckSquare, AlertCircle, ArrowRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import ErrorState from '@/components/ui/ErrorState';
import StatCard from '@/components/analytics/StatCard';
import StatusBarChart from '@/components/analytics/StatusBarChart';
import { CHART_COLORS } from '@/components/analytics/chartColors';
import { describeActivity } from '@/components/activity/describeActivity';
import { useDashboardAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useDashboardAnalytics();

  const stats = [
    { label: 'Workspaces', value: data?.totalWorkspaces, icon: Boxes },
    { label: 'Projects', value: data?.totalProjects, icon: FolderKanban },
    { label: 'Tasks', value: data?.totalTasks, icon: CheckSquare },
    { label: 'Issues', value: data ? data.openIssues + data.resolvedIssues : undefined, icon: AlertCircle },
  ];

  const taskData = data
    ? [
        { key: 'completed', label: 'Completed', value: data.completedTasks },
        { key: 'remaining', label: 'Remaining', value: Math.max(0, data.totalTasks - data.completedTasks) },
      ]
    : [];

  const issueData = data
    ? [
        { key: 'open', label: 'Open', value: data.openIssues },
        { key: 'resolved', label: 'Resolved', value: data.resolvedIssues },
      ]
    : [];

  return (
    <AppShell title="Analytics">
      <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand">
        <BarChart3 className="h-3.5 w-3.5" />
        Across every workspace you belong to
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Analytics</h2>
      <p className="mt-1 text-sm text-muted">
        For a deeper breakdown of one workspace or project, open its own Analytics tab.
      </p>

      {isError ? (
        <ErrorState message="Unable to load analytics." onRetry={refetch} className="mt-8" />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} loading={isLoading} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">Tasks</p>
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted">Loading...</div>
                ) : (
                  <StatusBarChart data={taskData} colors={{ completed: CHART_COLORS.signal, remaining: CHART_COLORS.muted }} />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">Issues</p>
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted">Loading...</div>
                ) : (
                  <StatusBarChart data={issueData} colors={{ open: CHART_COLORS.danger, resolved: CHART_COLORS.signal }} />
                )}
              </div>
            </Card>
          </div>

          <Card className="mt-4 p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Recent activity</p>
            <div className="mt-3 space-y-2.5">
              {isLoading && <p className="text-sm text-muted">Loading...</p>}
              {!isLoading && (!data?.recentActivity || data.recentActivity.length === 0) && (
                <p className="py-4 text-center text-sm text-muted">No activity yet.</p>
              )}
              {data?.recentActivity?.slice(0, 8).map((a) => (
                <div key={a.id}>
                  <p className="text-sm text-ink">{describeActivity(a)}</p>
                  <p className="text-xs text-muted">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {a.workspace_name}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-4 flex items-center justify-between p-5">
            <p className="text-sm text-ink">Want completion rates, priority breakdowns, or team activity for one workspace or project?</p>
            <Link href="/workspaces" className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong">
              Browse workspaces
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </>
      )}
    </AppShell>
  );
}
