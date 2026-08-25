'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useCreateProject } from '@/hooks/useProjects';
import { useWorkspaces } from '@/hooks/useWorkspaces';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const schema = z.object({
  workspaceId: z.string().uuid('Choose a workspace'),
  name: z.string().trim().min(3, 'Name must be 3-100 characters').max(100),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().optional().or(z.literal('')),
  deadline: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= todayISO(), 'Deadline cannot be before today'),
});

export default function CreateProjectModal({ open, onClose, workspaceId, onCreated }) {
  const createProject = useCreateProject();
  const { data: workspaces } = useWorkspaces();
  const manageable = workspaces?.filter((w) => w.my_role === 'owner' || w.my_role === 'admin') ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { workspaceId: workspaceId || '', priority: 'medium' },
  });

  const close = () => {
    reset({ workspaceId: workspaceId || '', priority: 'medium' });
    createProject.reset();
    onClose();
  };

  const onSubmit = (values) => {
    createProject.mutate(
      {
        workspaceId: values.workspaceId,
        name: values.name,
        description: values.description || undefined,
        priority: values.priority,
        startDate: values.startDate || undefined,
        deadline: values.deadline || undefined,
      },
      {
        onSuccess: (res) => {
          close();
          onCreated?.(res.data.project);
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Create a project" description="Projects live inside a workspace.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {createProject.isError && <Alert variant="danger">{createProject.error.message}</Alert>}

        {workspaceId ? (
          <input type="hidden" {...register('workspaceId')} />
        ) : (
          <div>
            <Label htmlFor="proj-workspace">Workspace</Label>
            <Select id="proj-workspace" {...register('workspaceId')}>
              <option value="">Choose a workspace...</option>
              {manageable.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.workspaceId?.message}</FieldError>
            {manageable.length === 0 && (
              <p className="mt-1.5 text-xs text-muted">
                You need admin or owner access in a workspace to create projects there.
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="proj-name">Project name</Label>
          <Input id="proj-name" placeholder="Website Redesign" error={!!errors.name} {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="proj-description">Description (optional)</Label>
          <Textarea id="proj-description" rows={3} placeholder="What's this project about?" {...register('description')} />
          <FieldError>{errors.description?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="proj-priority">Priority</Label>
            <Select id="proj-priority" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="proj-deadline">Deadline (optional)</Label>
            <Input id="proj-deadline" type="date" min={todayISO()} error={!!errors.deadline} {...register('deadline')} />
            <FieldError>{errors.deadline?.message}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor="proj-start">Start date (optional)</Label>
          <Input id="proj-start" type="date" {...register('startDate')} />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={createProject.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
