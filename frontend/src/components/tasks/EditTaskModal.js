'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useUpdateTask } from '@/hooks/useTasks';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

const schema = z.object({
  title: z.string().trim().min(3, 'Title must be 3-200 characters').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  dueDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= todayISO(), 'Due date cannot be before today'),
  estimatedHours: z.string().optional().or(z.literal('')),
});

export default function EditTaskModal({ open, onClose, task }) {
  const updateTask = useUpdateTask(task?.id, task?.project_id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        dueDate: toDateInputValue(task.due_date),
        estimatedHours: task.estimated_hours ? String(task.estimated_hours) : '',
      });
    }
  }, [task, reset]);

  const close = () => {
    updateTask.reset();
    onClose();
  };

  const onSubmit = (values) => {
    updateTask.mutate(
      {
        title: values.title,
        description: values.description || null,
        dueDate: values.dueDate || null,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
      },
      { onSuccess: close }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Edit task">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {updateTask.isError && <Alert variant="danger">{updateTask.error.message}</Alert>}

        <div>
          <Label htmlFor="edit-task-title">Title</Label>
          <Input id="edit-task-title" error={!!errors.title} {...register('title')} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="edit-task-description">Description</Label>
          <Textarea id="edit-task-description" rows={4} {...register('description')} />
          <FieldError>{errors.description?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-task-due">Due date</Label>
            <Input id="edit-task-due" type="date" min={todayISO()} error={!!errors.dueDate} {...register('dueDate')} />
            <FieldError>{errors.dueDate?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="edit-task-hours">Estimated hours</Label>
            <Input id="edit-task-hours" type="number" min="0.5" step="0.5" {...register('estimatedHours')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" loading={updateTask.isPending}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
