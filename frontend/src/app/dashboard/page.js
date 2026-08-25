'use client';

import Link from 'next/link';
import { Boxes, CheckSquare, FolderKanban, Users, ArrowRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: projects, isLoading: projectsLoading } = useProjects({ sort: 'newest' });
  // Root cause of the "Tasks assigned" bug: this stat was a literal
  // hardcoded string ('0'), never wired to any query at all — not a stale
  // cache, not a wrong column, not a missing invalidation. It just never
  // queried anything. Fixed by reusing the existing GET /api/tasks
  // endpoint's assignedTo filter (already correctly backed by
  // tasks.assigned_to in task.service.js) with pageSize:1, the same
  // "count-only" convention already used for the Issues tab's badge count
  // — so no new backend endpoint, no new query-key shape.
  const { data: assignedTasks } = useTasks({ assignedTo: user?.id, pageSize: 1 });

  const stats = [
    { label: 'Workspaces', value: workspaces?.length ?? '—', icon: Boxes },
    { label: 'Projects', value: projects?.length ?? '—', icon: FolderKanban },
    { label: 'Tasks assigned', value: assignedTasks?.total ?? '—', icon: CheckSquare },
    {
      label: 'Total members',
      value: workspaces?.reduce((sum, w) => sum + w.member_count, 0) ?? '—',
      icon: Users,
    },
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

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon className="h-4 w-4 text-brand" />
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </Card>
        ))}
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
