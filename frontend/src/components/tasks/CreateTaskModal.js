'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useCreateTask } from '@/hooks/useTasks';
import { useWorkspaceMembers } from '@/hooks/useWorkspaces';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const schema = z.object({
  title: z.string().trim().min(3, 'Title must be 3-200 characters').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  assignedTo: z.string().optional().or(z.literal('')),
  dueDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= todayISO(), 'Due date cannot be before today'),
  estimatedHours: z.string().optional().or(z.literal('')),
});

export default function CreateTaskModal({ open, onClose, projectId, workspaceId, defaultStatus = 'backlog' }) {
  const createTask = useCreateTask();
  const { data: members } = useWorkspaceMembers(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { priority: 'medium' } });

  const close = () => {
    reset({ priority: 'medium', title: '', description: '', assignedTo: '', dueDate: '', estimatedHours: '' });
    createTask.reset();
    onClose();
  };

  const onSubmit = (values) => {
    createTask.mutate(
      {
        projectId,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        status: defaultStatus,
        assignedTo: values.assignedTo || undefined,
        dueDate: values.dueDate || undefined,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : undefined,
      },
      { onSuccess: close }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Create a task">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {createTask.isError && <Alert variant="danger">{createTask.error.message}</Alert>}

        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input id="task-title" placeholder="Design the onboarding flow" error={!!errors.title} {...register('title')} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="task-description">Description (optional)</Label>
          <Textarea id="task-description" rows={3} {...register('description')} />
          <FieldError>{errors.description?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="task-assignee">Assignee (optional)</Label>
            <Select id="task-assignee" {...register('assignedTo')}>
              <option value="">Unassigned</option>
              {members?.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-due">Due date (optional)</Label>
            <Input id="task-due" type="date" min={todayISO()} error={!!errors.dueDate} {...register('dueDate')} />
            <FieldError>{errors.dueDate?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="task-hours">Estimated hours (optional)</Label>
            <Input id="task-hours" type="number" min="0.5" step="0.5" placeholder="4" {...register('estimatedHours')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" loading={createTask.isPending}>Create task</Button>
        </div>
      </form>
    </Modal>
  );
}
