'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useInviteMember } from '@/hooks/useWorkspaces';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  role: z.enum(['admin', 'member', 'viewer']),
});

export default function InviteMemberModal({ open, onClose, workspaceId }) {
  const inviteMember = useInviteMember(workspaceId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { role: 'member' } });

  const close = () => {
    reset({ email: '', role: 'member' });
    inviteMember.reset();
    onClose();
  };

  const onSubmit = (values) => inviteMember.mutate(values);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite a member"
      description="We'll email them a link to join this workspace."
    >
      {inviteMember.isSuccess ? (
        <div className="space-y-4">
          <Alert variant="success">Invitation sent to {inviteMember.variables?.email}.</Alert>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                inviteMember.reset();
                reset({ email: '', role: 'member' });
              }}
            >
              Invite another
            </Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {inviteMember.isError && <Alert variant="danger">{inviteMember.error.message}</Alert>}

          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              error={!!errors.email}
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select id="invite-role" {...register('role')}>
              <option value="admin">Admin — manage members, projects, tasks</option>
              <option value="member">Member — work on tasks</option>
              <option value="viewer">Viewer — read only</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteMember.isPending}>
              Send invite
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
