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
import { useUpdateWorkspace } from '@/hooks/useWorkspaces';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be 2-160 characters').max(160),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  logoUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
});

export default function EditWorkspaceModal({ open, onClose, workspace }) {
  const updateWorkspace = useUpdateWorkspace(workspace?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (workspace) {
      reset({
        name: workspace.name,
        description: workspace.description || '',
        logoUrl: workspace.logo_url || '',
      });
    }
  }, [workspace, reset]);

  const close = () => {
    updateWorkspace.reset();
    onClose();
  };

  const onSubmit = (values) => {
    updateWorkspace.mutate(
      {
        name: values.name,
        description: values.description || null,
        logoUrl: values.logoUrl || null,
      },
      { onSuccess: close }
    );
  };

  return (
    <Modal open={open} onClose={close} title="Edit workspace">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {updateWorkspace.isError && (
          <Alert variant="danger">{updateWorkspace.error.message}</Alert>
        )}

        <div>
          <Label htmlFor="edit-ws-name">Workspace name</Label>
          <Input id="edit-ws-name" error={!!errors.name} {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="edit-ws-description">Description</Label>
          <Textarea id="edit-ws-description" rows={3} {...register('description')} />
        </div>

        <div>
          <Label htmlFor="edit-ws-logo">Logo URL</Label>
          <Input
            id="edit-ws-logo"
            placeholder="https://example.com/logo.png"
            error={!!errors.logoUrl}
            {...register('logoUrl')}
          />
          <FieldError>{errors.logoUrl?.message}</FieldError>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={updateWorkspace.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
