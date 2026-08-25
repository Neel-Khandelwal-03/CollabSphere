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
import { useUpdateProject } from '@/hooks/useProjects';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

const schema = z.object({
  name: z.string().trim().min(3, 'Name must be 3-100 characters').max(100),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  status: z.enum(['planning', 'active', 'on_hold', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().optional().or(z.literal('')),
  deadline: z.string().optional().or(z.literal('')),
});

export default function EditProjectModal({ open, onClose, project }) {
  const updateProject = useUpdateProject(project?.id, project?.workspace_id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status === 'archived' ? 'planning' : project.status,
        priority: project.priority,
        startDate: toDateInputValue(project.start_date),
        deadline: toDateInputValue(project.deadline),
      });
    }
  }, [project, reset]);

  const close = () => {
    updateProject.reset();
    onClose();
  };

  const onSubmit = (values) => {
    updateProject.mutate(
      {
        name: values.name,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        startDate: values.startDate || null,
        deadline: values.deadline || null,
      },
      { onSuccess: close }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Edit project">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {updateProject.isError && <Alert variant="danger">{updateProject.error.message}</Alert>}

        <div>
          <Label htmlFor="edit-proj-name">Project name</Label>
          <Input id="edit-proj-name" error={!!errors.name} {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="edit-proj-description">Description</Label>
          <Textarea id="edit-proj-description" rows={3} {...register('description')} />
          <FieldError>{errors.description?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-proj-status">Status</Label>
            <Select id="edit-proj-status" {...register('status')}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-proj-priority">Priority</Label>
            <Select id="edit-proj-priority" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-proj-start">Start date</Label>
            <Input id="edit-proj-start" type="date" {...register('startDate')} />
          </div>
          <div>
            <Label htmlFor="edit-proj-deadline">Deadline</Label>
            <Input id="edit-proj-deadline" type="date" min={todayISO()} {...register('deadline')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={updateProject.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
