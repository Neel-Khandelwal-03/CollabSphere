'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Boxes } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import RoleBadge from '@/components/ui/RoleBadge';
import CreateWorkspaceModal from '@/components/workspaces/CreateWorkspaceModal';
import { useWorkspaces } from '@/hooks/useWorkspaces';

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AppShell
      title="Workspaces"
      actions={
        <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          New workspace
        </Button>
      }
    >
      <div className="flex items-center justify-between sm:hidden">
        <p className="text-sm text-muted">{workspaces?.length ?? 0} workspaces</p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-40 animate-pulse p-5" />
          ))}
        </div>
      )}

      {!isLoading && workspaces?.length === 0 && (
        <Card className="mt-8 flex flex-col items-center gap-3 p-12 text-center">
          <Boxes className="h-8 w-8 text-brand" />
          <p className="font-display text-base font-semibold text-ink">No workspaces yet</p>
          <p className="max-w-sm text-sm text-muted">
            Create a workspace to start organizing projects, tasks, and your team in one place.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-2">
            Create your first workspace
          </Button>
        </Card>
      )}

      {!isLoading && workspaces?.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <Avatar name={ws.name} src={ws.logo_url} size={40} />
                  <RoleBadge role={ws.my_role} />
                </div>
                <p className="mt-3 font-display text-base font-semibold text-ink">{ws.name}</p>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">
                  {ws.description || 'No description yet.'}
                </p>
                <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {ws.member_count} member{ws.member_count === 1 ? '' : 's'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Boxes className="h-3.5 w-3.5" />
                    {ws.project_count} project{ws.project_count === 1 ? '' : 's'}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
