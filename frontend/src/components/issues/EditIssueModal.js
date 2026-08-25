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
import { useUpdateIssue } from '@/hooks/useIssues';

const TYPES = [
  ['bug', 'Bug'], ['feature_request', 'Feature Request'], ['improvement', 'Improvement'],
  ['task', 'Task'], ['research', 'Research'], ['epic', 'Epic'], ['documentation', 'Documentation'],
  ['performance', 'Performance'], ['security', 'Security'], ['technical_debt', 'Technical Debt'],
];

const schema = z.object({
  title: z.string().trim().min(3, 'Title must be 3-200 characters').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  type: z.string(),
});

export default function EditIssueModal({ open, onClose, issue }) {
  const updateIssue = useUpdateIssue(issue?.id, issue?.project_id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (issue) reset({ title: issue.title, description: issue.description || '', type: issue.type });
  }, [issue, reset]);

  const close = () => {
    updateIssue.reset();
    onClose();
  };

  const onSubmit = (values) => {
    updateIssue.mutate(
      { title: values.title, description: values.description || null, type: values.type },
      { onSuccess: close }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Edit issue">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {updateIssue.isError && <Alert variant="danger">{updateIssue.error.message}</Alert>}

        <div>
          <Label htmlFor="edit-issue-title">Title</Label>
          <Input id="edit-issue-title" error={!!errors.title} {...register('title')} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="edit-issue-description">Description</Label>
          <Textarea id="edit-issue-description" rows={4} {...register('description')} />
          <FieldError>{errors.description?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="edit-issue-type">Type</Label>
          <Select id="edit-issue-type" {...register('type')}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" loading={updateIssue.isPending}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
