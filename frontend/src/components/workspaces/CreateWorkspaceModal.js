'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useCreateWorkspace } from '@/hooks/useWorkspaces';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be 2-160 characters').max(160),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  logoUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
});

export default function CreateWorkspaceModal({ open, onClose, onCreated }) {
  const createWorkspace = useCreateWorkspace();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const close = () => {
    reset();
    createWorkspace.reset();
    onClose();
  };

  const onSubmit = (values) => {
    createWorkspace.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        logoUrl: values.logoUrl || undefined,
      },
      {
        onSuccess: (res) => {
          close();
          onCreated?.(res.data.workspace);
        },
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create a workspace"
      description="You'll be the owner and can invite your team next."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {createWorkspace.isError && (
          <Alert variant="danger">{createWorkspace.error.message}</Alert>
        )}

        <div>
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input id="ws-name" placeholder="Acme Engineering" error={!!errors.name} {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="ws-description">Description (optional)</Label>
          <Textarea
            id="ws-description"
            rows={3}
            placeholder="What's this workspace for?"
            {...register('description')}
          />
        </div>

        <div>
          <Label htmlFor="ws-logo">Logo URL (optional)</Label>
          <Input
            id="ws-logo"
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
          <Button type="submit" loading={createWorkspace.isPending}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
