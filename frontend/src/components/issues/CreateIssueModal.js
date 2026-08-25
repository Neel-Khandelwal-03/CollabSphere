'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useCreateIssue } from '@/hooks/useIssues';
import { useWorkspaces, useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useWorkspaceProjects } from '@/hooks/useProjects';
import { useProjectTasks } from '@/hooks/useTasks';

const TYPES = [
  ['bug', 'Bug'], ['feature_request', 'Feature Request'], ['improvement', 'Improvement'],
  ['task', 'Task'], ['research', 'Research'], ['epic', 'Epic'], ['documentation', 'Documentation'],
  ['performance', 'Performance'], ['security', 'Security'], ['technical_debt', 'Technical Debt'],
];

const schema = z.object({
  workspaceId: z.string().uuid('Choose a workspace'),
  projectId: z.string().uuid('Choose a project'),
  title: z.string().trim().min(3, 'Title must be 3-200 characters').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  type: z.enum(['bug', 'feature_request', 'improvement', 'task', 'research', 'epic', 'documentation', 'performance', 'security', 'technical_debt']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  severity: z.enum(['minor', 'major', 'critical', 'blocker']),
  assigneeId: z.string().optional().or(z.literal('')),
  linkedTaskId: z.string().optional().or(z.literal('')),
});

const emptyDefaults = (workspaceId, projectId) => ({
  workspaceId: workspaceId || '',
  projectId: projectId || '',
  type: 'bug',
  priority: 'medium',
  severity: 'minor',
  title: '',
  description: '',
  assigneeId: '',
  linkedTaskId: '',
});

/**
 * `workspaceId`/`projectId` props lock the corresponding field (used from
 * the Project Details "Issues" tab, where the project is already known).
 * When omitted (used from the global /issues page), the modal shows a
 * cascading Workspace -> Project selector instead — the same
 * locked-prop-vs-inline-selector pattern already established by
 * CreateProjectModal for its own optional workspace selector, reused here
 * rather than inventing a second creation flow.
 *
 * Backend authorization is independent of anything selected here: POST
 * /api/issues resolves the real workspace from the submitted project row
 * server-side (see resolveProjectFromBody in loadTask.js) and checks
 * membership against *that*, not against whatever this form sent — so a
 * user can only ever end up seeing 403s here, never bypassing access.
 * This selector exists purely so they don't have to discover that by
 * trial and error.
 */
export default function CreateIssueModal({ open, onClose, projectId, workspaceId }) {
  const createIssue = useCreateIssue();
  const locked = Boolean(workspaceId && projectId);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults(workspaceId, projectId),
  });

  const selectedWorkspaceId = locked ? workspaceId : watch('workspaceId');
  const selectedProjectId = locked ? projectId : watch('projectId');

  const { data: workspaces } = useWorkspaces();
  // Only workspaces where the user could actually pass the backend's
  // requireWorkspaceRole('member') gate on POST /issues — a Viewer can't
  // create issues there, so there's no point offering it. The backend
  // enforces this independently regardless (see note above); this is
  // purely to avoid sending someone toward a guaranteed 403.
  const creatable = workspaces?.filter((w) => w.my_role !== 'viewer') ?? [];
  const { data: projects } = useWorkspaceProjects(selectedWorkspaceId);
  const { data: members } = useWorkspaceMembers(selectedWorkspaceId);
  const { data: tasks } = useProjectTasks(selectedProjectId);

  // Changing the workspace invalidates whatever project/assignee/task was
  // previously chosen, since those all belong to the old workspace.
  useEffect(() => {
    if (!locked) {
      setValue('projectId', '');
      setValue('assigneeId', '');
      setValue('linkedTaskId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceId]);

  const close = () => {
    reset(emptyDefaults(workspaceId, projectId));
    createIssue.reset();
    onClose();
  };

  const onSubmit = (values) => {
    createIssue.mutate(
      {
        projectId: values.projectId,
        title: values.title,
        description: values.description || undefined,
        type: values.type,
        priority: values.priority,
        severity: values.severity,
        assigneeId: values.assigneeId || undefined,
        linkedTaskId: values.linkedTaskId || undefined,
      },
      { onSuccess: () => setTimeout(close, 900) }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Raise an issue">
      {createIssue.isSuccess ? (
        <Alert variant="success">Issue raised successfully.</Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {createIssue.isError && <Alert variant="danger">{createIssue.error.message}</Alert>}

          {locked ? (
            <>
              <input type="hidden" {...register('workspaceId')} />
              <input type="hidden" {...register('projectId')} />
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issue-workspace">Workspace</Label>
                <Select id="issue-workspace" {...register('workspaceId')}>
                  <option value="">Choose a workspace...</option>
                  {creatable.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
                <FieldError>{errors.workspaceId?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="issue-project">Project</Label>
                <Select id="issue-project" disabled={!selectedWorkspaceId} {...register('projectId')}>
                  <option value="">
                    {selectedWorkspaceId ? 'Choose a project...' : 'Choose a workspace first'}
                  </option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <FieldError>{errors.projectId?.message}</FieldError>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="issue-title">Title</Label>
            <Input id="issue-title" placeholder="Login button does nothing on click" error={!!errors.title} {...register('title')} />
            <FieldError>{errors.title?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="issue-description">Description</Label>
            <Textarea id="issue-description" rows={3} placeholder="Steps to reproduce, expected vs actual..." {...register('description')} />
            <FieldError>{errors.description?.message}</FieldError>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="issue-type">Type</Label>
              <Select id="issue-type" {...register('type')}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="issue-priority">Priority</Label>
              <Select id="issue-priority" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="issue-severity">Severity</Label>
              <Select id="issue-severity" {...register('severity')}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
                <option value="blocker">Blocker</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="issue-assignee">Assignee (optional)</Label>
              <Select id="issue-assignee" disabled={!selectedWorkspaceId} {...register('assigneeId')}>
                <option value="">Unassigned</option>
                {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="issue-task">Link a task (optional)</Label>
              <Select id="issue-task" disabled={!selectedProjectId} {...register('linkedTaskId')}>
                <option value="">No linked task</option>
                {tasks?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" loading={createIssue.isPending}>
              {createIssue.isPending ? 'Creating...' : 'Raise issue'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
