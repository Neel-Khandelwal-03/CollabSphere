'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Calendar, FolderKanban } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import AvatarStack from '@/components/ui/AvatarStack';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { useProjects } from '@/hooks/useProjects';
import ErrorState from '@/components/ui/ErrorState';

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ProjectsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [archived, setArchived] = useState('false');
  const [sort, setSort] = useState('newest');
  const [createOpen, setCreateOpen] = useState(false);

  const search = useDebounced(searchInput);
  const { data: projects, isLoading, isError, refetch } = useProjects({ search, status, priority, archived, sort });

  return (
    <AppShell
      title="Projects"
      actions={
        <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
        <Select value={archived} onChange={(e) => setArchived(e.target.value)} className="w-auto">
          <option value="false">Active only</option>
          <option value="true">Archived only</option>
          <option value="all">All</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="deadline">Deadline</option>
          <option value="alphabetical">Alphabetical</option>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="sm:hidden">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse p-5" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState message="Unable to load projects." onRetry={refetch} className="mt-8" />
      )}

      {!isLoading && !isError && projects?.length === 0 && (
        <Card className="mt-8 flex flex-col items-center gap-3 p-12 text-center">
          <FolderKanban className="h-8 w-8 text-brand" />
          <p className="font-display text-base font-semibold text-ink">No projects found</p>
          <p className="max-w-sm text-sm text-muted">
            {search || status || priority
              ? 'Try adjusting your search or filters.'
              : 'Create a project inside one of your workspaces to get started.'}
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-2">
            Create a project
          </Button>
        </Card>
      )}

      {!isLoading && projects?.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold text-ink">{p.name}</p>
                  <PriorityBadge priority={p.priority} />
                </div>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">
                  {p.description || 'No description yet.'}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-muted">· {p.workspace_name}</span>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Progress</span>
                    <span>0%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                    <div className="h-full w-0 rounded-full bg-brand" />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <AvatarStack members={p.member_preview} total={p.member_count} size={24} />
                  {p.deadline && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(p.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-muted">Created by {p.created_by_name}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
