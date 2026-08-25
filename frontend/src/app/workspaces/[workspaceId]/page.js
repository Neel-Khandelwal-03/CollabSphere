'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus,
  LogOut,
  Trash2,
  Users,
  Boxes,
  ChevronLeft,
  Plus,
  FolderKanban,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card, Alert } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import RoleBadge from '@/components/ui/RoleBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import AvatarStack from '@/components/ui/AvatarStack';
import { Select, Textarea } from '@/components/ui/Select';
import { Input, Label, FieldError } from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InviteMemberModal from '@/components/workspaces/InviteMemberModal';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import ChatPanel from '@/components/chat/ChatPanel';
import FileManager from '@/components/files/FileManager';
import { useAuthStore } from '@/store/authStore';
import {
  useWorkspace,
  useWorkspaceMembers,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useLeaveWorkspace,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/useWorkspaces';
import { useWorkspaceProjects } from '@/hooks/useProjects';
import { useWorkspaceChat } from '@/hooks/useChat';

const SETTABLE_ROLES = ['admin', 'member', 'viewer'];
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'projects', label: 'Projects' },
  { key: 'chat', label: 'Chat' },
  { key: 'files', label: 'Files' },
  { key: 'members', label: 'Members' },
  { key: 'settings', label: 'Settings' },
];

function describeActivity(item) {
  switch (item.type) {
    case 'workspace_created':
      return `${item.actor_name} created the workspace`;
    case 'member_joined':
      return `${item.actor_name} joined as ${item.role}`;
    case 'invitation_sent':
      return `${item.actor_name || 'Someone'} invited ${item.target_label} as ${item.role}`;
    case 'invitation_accepted':
      return `${item.target_label} accepted their invitation`;
    case 'invitation_rejected':
      return `${item.target_label} declined their invitation`;
    default:
      return 'Unknown activity';
  }
}

const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Name must be 2-160 characters').max(160),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  logoUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
});

function OverviewTab({ workspace, recentActivity }) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <Users className="h-4 w-4 text-brand" />
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{workspace.member_count}</p>
            <p className="mt-1 text-xs text-muted">Members</p>
          </Card>
          <Card className="p-5">
            <Boxes className="h-4 w-4 text-brand" />
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{workspace.project_count}</p>
            <p className="mt-1 text-xs text-muted">Active projects</p>
          </Card>
        </div>
        <Card className="p-6">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">About</p>
          <p className="mt-3 text-sm text-ink">{workspace.description || 'No description yet.'}</p>
          <p className="mt-4 text-xs text-muted">
            Created {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Recent activity</p>
        {!recentActivity || recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing to show yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentActivity.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <div>
                  <p className="text-ink">{describeActivity(item)}</p>
                  <p className="text-xs text-muted">{new Date(item.occurred_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ProjectsTab({ workspaceId, canManage }) {
  const { data: projects, isLoading } = useWorkspaceProjects(workspaceId, { archived: 'false' });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {isLoading ? 'Loading...' : `${projects?.length ?? 0} active project${projects?.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm font-medium text-brand hover:text-brand-strong">
            Open full projects view
          </Link>
          {canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Card key={i} className="h-40 animate-pulse p-5" />
          ))}
        </div>
      )}

      {!isLoading && projects?.length === 0 && (
        <Card className="mt-4 flex flex-col items-center gap-3 p-10 text-center">
          <FolderKanban className="h-7 w-7 text-brand" />
          <p className="text-sm text-muted">No projects in this workspace yet.</p>
          {canManage && (
            <Button onClick={() => setCreateOpen(true)} className="mt-1">
              Create the first project
            </Button>
          )}
        </Card>
      )}

      {!isLoading && projects?.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="mt-3">
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <AvatarStack members={p.member_preview} total={p.member_count} size={22} />
                  {p.deadline && (
                    <span className="text-xs text-muted">
                      Due {new Date(p.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} workspaceId={workspaceId} />
    </div>
  );
}

function MembersTab({ workspaceId, members, membersLoading, canManage, currentUser }) {
  const updateMemberRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const [memberToRemove, setMemberToRemove] = useState(null);

  return (
    <div className="mt-6">
      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Members ({members?.length ?? 0})
        </p>
        <div className="mt-4 space-y-1">
          {membersLoading && <p className="text-sm text-muted">Loading members...</p>}
          {members?.map((m) => {
            const isSelf = m.user_id === currentUser?.id;
            const isMemberOwner = m.role === 'owner';
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-ink/[0.02]">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {m.name} {isSelf && <span className="text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canManage && !isMemberOwner ? (
                    <Select
                      value={m.role}
                      onChange={(e) => updateMemberRole.mutate({ memberId: m.id, role: e.target.value })}
                      className="w-auto py-1.5 text-xs"
                      disabled={updateMemberRole.isPending}
                    >
                      {SETTABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </Select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                  {canManage && !isMemberOwner && (
                    <button
                      onClick={() => setMemberToRemove(m)}
                      className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ConfirmDialog
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title={`Remove ${memberToRemove?.name}?`}
        description="They'll lose access to this workspace immediately."
        confirmLabel="Remove member"
        loading={removeMember.isPending}
        onConfirm={() => removeMember.mutate(memberToRemove.id, { onSuccess: () => setMemberToRemove(null) })}
      />
    </div>
  );
}

function SettingsTab({ workspace, isOwner, onDeleteClick, onLeaveClick }) {
  const updateWorkspace = useUpdateWorkspace(workspace.id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    reset({
      name: workspace.name,
      description: workspace.description || '',
      logoUrl: workspace.logo_url || '',
    });
  }, [workspace, reset]);

  const onSubmit = (values) => {
    updateWorkspace.mutate({
      name: values.name,
      description: values.description || null,
      logoUrl: values.logoUrl || null,
    });
  };

  return (
    <div className="mt-6 max-w-xl space-y-6">
      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Workspace settings</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
          {updateWorkspace.isError && <Alert variant="danger">{updateWorkspace.error.message}</Alert>}
          {updateWorkspace.isSuccess && <Alert variant="success">Saved.</Alert>}

          <div>
            <Label htmlFor="settings-name">Workspace name</Label>
            <Input id="settings-name" error={!!errors.name} {...register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="settings-description">Description</Label>
            <Textarea id="settings-description" rows={3} {...register('description')} />
          </div>
          <div>
            <Label htmlFor="settings-logo">Logo URL</Label>
            <Input id="settings-logo" placeholder="https://example.com/logo.png" error={!!errors.logoUrl} {...register('logoUrl')} />
            <FieldError>{errors.logoUrl?.message}</FieldError>
          </div>
          <Button type="submit" loading={updateWorkspace.isPending}>
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="border-danger/20 p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-danger">Danger zone</p>
        <p className="mt-2 text-sm text-muted">
          {isOwner
            ? 'Deleting this workspace removes all projects and members permanently.'
            : "You'll lose access to this workspace until someone re-invites you."}
        </p>
        <Button
          variant="outline"
          className="mt-4 border-danger/30 text-danger hover:border-danger"
          onClick={isOwner ? onDeleteClick : onLeaveClick}
        >
          {isOwner ? (
            <>
              <Trash2 className="h-4 w-4" />
              Delete workspace
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Leave workspace
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useWorkspace(workspaceId);
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const { data: chatData } = useWorkspaceChat(workspaceId);

  const deleteWorkspace = useDeleteWorkspace();
  const leaveWorkspace = useLeaveWorkspace();

  const [activeTab, setActiveTab] = useState('overview');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  if (error) {
    return (
      <AppShell title="Workspace">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">
            You don&apos;t have access to this workspace, or it no longer exists.
          </p>
          <Button as={Link} href="/workspaces" variant="outline" className="mt-4">
            Back to workspaces
          </Button>
        </Card>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Workspace">
        <Card className="h-32 animate-pulse p-6" />
      </AppShell>
    );
  }

  const { workspace, myRole, recentActivity } = data;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  return (
    <AppShell title={workspace.name}>
      <Link href="/workspaces" className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" />
        All workspaces
      </Link>

      <Card className="p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <Avatar name={workspace.name} src={workspace.logo_url} size={52} />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-xl font-semibold text-ink">{workspace.name}</h2>
                <RoleBadge role={myRole} />
              </div>
              <p className="mt-1 max-w-lg text-sm text-muted">
                {workspace.description || 'No description yet.'}
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-6">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'overview' && <OverviewTab workspace={workspace} recentActivity={recentActivity} />}
      {activeTab === 'projects' && <ProjectsTab workspaceId={workspaceId} canManage={canManage} />}
      {activeTab === 'chat' && (
        <Card className="mt-6 h-[calc(100vh-320px)] p-4">
          {chatData ? (
            <ChatPanel
              conversationId={chatData.conversation.id}
              conversationType="workspace"
              initialMessages={chatData.messages}
              initialReadStates={chatData.readStates}
              myRole={myRole}
              className="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">Loading chat...</div>
          )}
        </Card>
      )}
      {activeTab === 'files' && (
        <div className="mt-6">
          <FileManager scope={{ type: 'workspace', workspaceId }} myRole={myRole} />
        </div>
      )}
      {activeTab === 'members' && (
        <MembersTab
          workspaceId={workspaceId}
          members={members}
          membersLoading={membersLoading}
          canManage={canManage}
          currentUser={currentUser}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsTab
          workspace={workspace}
          isOwner={isOwner}
          onDeleteClick={() => setDeleteOpen(true)}
          onLeaveClick={() => setLeaveOpen(true)}
        />
      )}

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} workspaceId={workspaceId} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this workspace?"
        description={`This permanently deletes "${workspace.name}" and removes all members. This can't be undone.`}
        confirmLabel="Delete workspace"
        loading={deleteWorkspace.isPending}
        onConfirm={() => deleteWorkspace.mutate(workspaceId, { onSuccess: () => router.push('/workspaces') })}
      />

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Leave this workspace?"
        description={`You'll lose access to "${workspace.name}" until someone re-invites you.`}
        confirmLabel="Leave workspace"
        loading={leaveWorkspace.isPending}
        onConfirm={() => leaveWorkspace.mutate(workspaceId, { onSuccess: () => router.push('/workspaces') })}
      />
    </AppShell>
  );
}
