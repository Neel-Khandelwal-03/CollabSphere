'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Trash2, Archive, ArchiveRestore, ChevronLeft, Calendar, CalendarClock,
  Boxes, Plus, UserMinus, CheckSquare, Bug,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card, Alert } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import Tabs from '@/components/ui/Tabs';
import { Select, Textarea } from '@/components/ui/Select';
import { Input, Label, FieldError } from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AssignMembersModal from '@/components/projects/AssignMembersModal';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskTable from '@/components/tasks/TaskTable';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskDetailsDrawer from '@/components/tasks/TaskDetailsDrawer';
import IssueTable from '@/components/issues/IssueTable';
import CreateIssueModal from '@/components/issues/CreateIssueModal';
import IssueDetailsDrawer from '@/components/issues/IssueDetailsDrawer';
import ChatPanel from '@/components/chat/ChatPanel';
import { useProject, useDeleteProject, useArchiveProject, useRestoreProject, useUpdateProject } from '@/hooks/useProjects';
import { useProjectTasks } from '@/hooks/useTasks';
import { useProjectIssues } from '@/hooks/useIssues';
import { useProjectChat } from '@/hooks/useChat';

const TABS = [
  { key: 'kanban', label: 'Kanban' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'issues', label: 'Issues' },
  { key: 'chat', label: 'Chat' },
  { key: 'overview', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'settings', label: 'Settings' },
];

const TASK_COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
  { key: 'completed', label: 'Completed' },
];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function OverviewTab({ project, tasks }) {
  const counts = TASK_COLUMNS.reduce((acc, c) => {
    acc[c.key] = tasks.filter((t) => t.status === c.key).length;
    return acc;
  }, {});
  const recent = [...tasks].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="p-6">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Task summary</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TASK_COLUMNS.map((c) => (
              <div key={c.key} className="rounded-lg bg-ink/[0.03] p-3 text-center">
                <p className="font-display text-xl font-semibold text-ink">{counts[c.key]}</p>
                <p className="mt-0.5 text-xs text-muted">{c.label}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">About</p>
          <p className="mt-3 text-sm text-ink">{project.description || 'No description yet.'}</p>
        </Card>
      </div>
      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Recently updated</p>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No tasks yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recent.map((t) => (
              <li key={t.id} className="text-sm">
                <p className="font-medium text-ink">{t.title}</p>
                <p className="text-xs text-muted">{StatusLabel(t.status)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusLabel(status) {
  return TASK_COLUMNS.find((c) => c.key === status)?.label || status;
}

const settingsSchema = z.object({
  name: z.string().trim().min(3, 'Name must be 3-100 characters').max(100),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  deadline: z.string().optional().or(z.literal('')),
});

function SettingsTab({ project, isManager, onDeleteClick, onArchiveClick }) {
  const updateProject = useUpdateProject(project.id, project.workspace_id);
  const restoreProject = useRestoreProject(project.id, project.workspace_id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    reset({
      name: project.name,
      description: project.description || '',
      priority: project.priority,
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
    });
  }, [project, reset]);

  if (!isManager) {
    return (
      <Card className="mt-6 p-6">
        <p className="text-sm text-muted">Only admins and owners can edit project settings.</p>
      </Card>
    );
  }

  const onSubmit = (values) => {
    updateProject.mutate({
      name: values.name,
      description: values.description || null,
      priority: values.priority,
      deadline: values.deadline || null,
    });
  };

  return (
    <div className="mt-6 max-w-xl space-y-6">
      <Card className="p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Project settings</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
          {updateProject.isError && <Alert variant="danger">{updateProject.error.message}</Alert>}
          {updateProject.isSuccess && <Alert variant="success">Saved.</Alert>}
          <div>
            <Label htmlFor="s-name">Project name</Label>
            <Input id="s-name" error={!!errors.name} {...register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-desc">Description</Label>
            <Textarea id="s-desc" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-priority">Priority</Label>
              <Select id="s-priority" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="s-deadline">Deadline</Label>
              <Input id="s-deadline" type="date" min={todayISO()} {...register('deadline')} />
            </div>
          </div>
          <Button type="submit" loading={updateProject.isPending}>Save changes</Button>
        </form>
      </Card>

      <Card className="border-danger/20 p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-danger">Danger zone</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {project.archived ? (
            <Button variant="outline" onClick={() => restoreProject.mutate()} loading={restoreProject.isPending}>
              <ArchiveRestore className="h-4 w-4" /> Restore project
            </Button>
          ) : (
            <Button variant="outline" onClick={onArchiveClick}>
              <Archive className="h-4 w-4" /> Archive project
            </Button>
          )}
          <Button
            variant="outline"
            className="border-danger/30 text-danger hover:border-danger"
            onClick={onDeleteClick}
          >
            <Trash2 className="h-4 w-4" /> Delete project
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MembersTab({ projectId, workspaceId, members, isManager, onAssignClick }) {
  return (
    <Card className="mt-6 p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Assigned members ({members.length})
        </p>
        {isManager && (
          <Button variant="outline" onClick={onAssignClick}>
            <Plus className="h-4 w-4" /> Manage members
          </Button>
        )}
      </div>
      <div className="mt-4 space-y-1">
        {members.length === 0 && <p className="text-sm text-muted">No one is assigned yet.</p>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-ink/[0.02]">
            <Avatar name={m.name} src={m.avatar_url} size={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{m.name}</p>
              <p className="truncate text-xs text-muted">{m.email}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const { data, isLoading, error } = useProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useProjectTasks(projectId);
  const { data: issuesData } = useProjectIssues(projectId, { pageSize: 1 });
  const { data: chatData } = useProjectChat(projectId);

  const deleteProject = useDeleteProject(data?.project?.workspace_id);
  const archiveProject = useArchiveProject(projectId, data?.project?.workspace_id);

  const [activeTab, setActiveTab] = useState('kanban');
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState('backlog');
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState(null);

  if (error) {
    return (
      <AppShell title="Project">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">You don&apos;t have access to this project, or it no longer exists.</p>
          <Button as={Link} href="/projects" variant="outline" className="mt-4">Back to projects</Button>
        </Card>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Project">
        <Card className="h-32 animate-pulse p-6" />
      </AppShell>
    );
  }

  const { project, myRole, members } = data;
  const isManager = myRole === 'owner' || myRole === 'admin';
  const tabsWithCount = TABS.map((t) =>
    t.key === 'issues' ? { ...t, count: issuesData?.total ?? 0 } : t
  );

  return (
    <AppShell title={project.name}>
      <Link href={`/workspaces/${project.workspace_id}`} className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" />
        {project.workspace_name}
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-xl font-semibold text-ink">{project.name}</h2>
          <StatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <Link href={`/workspaces/${project.workspace_id}`} className="flex items-center gap-1.5 hover:text-brand">
            <Boxes className="h-3.5 w-3.5" /> {project.workspace_name}
          </Link>
          <span>Created by {project.created_by_name}</span>
          {project.start_date && (
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Starts {new Date(project.start_date).toLocaleDateString()}</span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Due {new Date(project.deadline).toLocaleDateString()}</span>
          )}
        </div>
      </Card>

      <div className="mt-6">
        <Tabs tabs={tabsWithCount} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'kanban' && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted">{tasksLoading ? 'Loading...' : `${tasks?.length ?? 0} tasks`}</p>
            {myRole !== 'viewer' && (
              <Button onClick={() => { setCreateTaskStatus('backlog'); setCreateTaskOpen(true); }}>
                <Plus className="h-4 w-4" /> New task
              </Button>
            )}
          </div>
          {tasksLoading ? (
            <Card className="h-64 animate-pulse p-6" />
          ) : (
            <KanbanBoard
              projectId={projectId}
              tasks={tasks || []}
              onTaskClick={(t) => setActiveTaskId(t.id)}
              onAddTask={(status) => { setCreateTaskStatus(status); setCreateTaskOpen(true); }}
              canCreate={myRole !== 'viewer'}
            />
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <CheckSquare className="h-4 w-4" /> All tasks in this project
            </p>
            {myRole !== 'viewer' && (
              <Button onClick={() => { setCreateTaskStatus('backlog'); setCreateTaskOpen(true); }}>
                <Plus className="h-4 w-4" /> New task
              </Button>
            )}
          </div>
          <TaskTable projectId={projectId} onTaskClick={(t) => setActiveTaskId(t.id)} />
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Bug className="h-4 w-4" /> All issues in this project
            </p>
            {myRole !== 'viewer' && (
              <Button onClick={() => setCreateIssueOpen(true)}>
                <Plus className="h-4 w-4" /> Raise Issue
              </Button>
            )}
          </div>
          <IssueTable projectId={projectId} onIssueClick={(i) => setActiveIssueId(i.id)} onCreateClick={() => setCreateIssueOpen(true)} />
        </div>
      )}

      {activeTab === 'chat' && (
        <Card className="mt-6 h-[calc(100vh-320px)] p-4">
          {chatData ? (
            <ChatPanel
              conversationId={chatData.conversation.id}
              conversationType="project"
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

      {activeTab === 'overview' && <OverviewTab project={project} tasks={tasks || []} />}

      {activeTab === 'members' && (
        <MembersTab
          projectId={projectId}
          workspaceId={project.workspace_id}
          members={members}
          isManager={isManager}
          onAssignClick={() => setAssignOpen(true)}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          project={project}
          isManager={isManager}
          onDeleteClick={() => setDeleteOpen(true)}
          onArchiveClick={() => setArchiveOpen(true)}
        />
      )}

      <AssignMembersModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        projectId={projectId}
        workspaceId={project.workspace_id}
        currentMembers={members}
      />

      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        projectId={projectId}
        workspaceId={project.workspace_id}
        defaultStatus={createTaskStatus}
      />

      {activeTaskId && (
        <TaskDetailsDrawer
          taskId={activeTaskId}
          workspaceId={project.workspace_id}
          onClose={() => setActiveTaskId(null)}
        />
      )}

      <CreateIssueModal
        open={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
        projectId={projectId}
        workspaceId={project.workspace_id}
      />

      {activeIssueId && (
        <IssueDetailsDrawer
          issueId={activeIssueId}
          workspaceId={project.workspace_id}
          onClose={() => setActiveIssueId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this project?"
        description={`This permanently deletes "${project.name}" and all of its tasks. This can't be undone.`}
        confirmLabel="Delete project"
        loading={deleteProject.isPending}
        onConfirm={() => deleteProject.mutate(projectId, { onSuccess: () => router.push('/projects') })}
      />

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Archive this project?"
        description="Archived projects are hidden from the default list but can be restored anytime."
        confirmLabel="Archive project"
        danger={false}
        loading={archiveProject.isPending}
        onConfirm={() => archiveProject.mutate(undefined, { onSuccess: () => setArchiveOpen(false) })}
      />
    </AppShell>
  );
}
