'use client';

import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import { useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useAssignProjectMember, useRemoveProjectMember } from '@/hooks/useProjects';

export default function AssignMembersModal({ open, onClose, projectId, workspaceId, currentMembers = [] }) {
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceId);
  const assignMember = useAssignProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const [selectedUserId, setSelectedUserId] = useState('');

  const assignedUserIds = new Set(currentMembers.map((m) => m.user_id));
  const assignable = (workspaceMembers || []).filter((m) => !assignedUserIds.has(m.user_id));

  const handleAssign = () => {
    if (!selectedUserId) return;
    assignMember.mutate(selectedUserId, { onSuccess: () => setSelectedUserId('') });
  };

  const close = () => {
    assignMember.reset();
    setSelectedUserId('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Assign members"
      description="Only workspace members can be assigned to a project."
    >
      <div className="space-y-4">
        {(assignMember.isError || removeMember.isError) && (
          <Alert variant="danger">{(assignMember.error || removeMember.error).message}</Alert>
        )}

        <div className="flex gap-2">
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={assignable.length === 0}
          >
            <option value="">
              {assignable.length === 0 ? 'Everyone is already assigned' : 'Choose a workspace member...'}
            </option>
            {assignable.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name} ({m.role})
              </option>
            ))}
          </Select>
          <Button onClick={handleAssign} disabled={!selectedUserId} loading={assignMember.isPending}>
            Add
          </Button>
        </div>

        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">
            Assigned ({currentMembers.length})
          </p>
          {currentMembers.length === 0 ? (
            <p className="text-sm text-muted">No one is assigned yet.</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {currentMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink/[0.02]">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} src={m.avatar_url} size={30} />
                    <div>
                      <p className="text-sm font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-muted">{m.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember.mutate(m.id)}
                    disabled={removeMember.isPending}
                    className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
                    aria-label={`Remove ${m.name}`}
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={close}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
