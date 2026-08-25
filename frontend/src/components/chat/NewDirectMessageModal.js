'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { useWorkspaces, useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useStartDirectConversation } from '@/hooks/useChat';
import { useAuthStore } from '@/store/authStore';

export default function NewDirectMessageModal({ open, onClose, onStarted }) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: workspaces } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState('');
  const [pickingId, setPickingId] = useState(null);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const startDirect = useStartDirectConversation();

  const close = () => {
    setWorkspaceId('');
    startDirect.reset();
    onClose();
  };

  const pick = (member) => {
    setPickingId(member.user_id);
    startDirect.mutate(
      { workspaceId, userId: member.user_id },
      {
        onSuccess: (res) => {
          onStarted({
            ...res.data,
            summary: { other_user_id: member.user_id, other_user_name: member.name, other_user_avatar: member.avatar_url },
          });
          close();
        },
        onSettled: () => setPickingId(null),
      }
    );
  };

  const otherMembers = (members || []).filter((m) => m.user_id !== currentUser?.id);

  return (
    <Modal open={open} onClose={close} title="New message">
      <div className="space-y-4">
        {startDirect.isError && (
          <Alert variant="danger">{startDirect.error.message || 'Could not start this conversation. Please try again.'}</Alert>
        )}

        <div>
          <Label htmlFor="dm-workspace">Workspace</Label>
          <Select id="dm-workspace" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
            <option value="">Choose a workspace...</option>
            {workspaces?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>

        {workspaceId && (
          <div>
            <Label>Message</Label>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line p-1.5">
              {otherMembers.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-muted">No other members in this workspace yet.</p>
              )}
              {otherMembers.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => pick(m)}
                  disabled={startDirect.isPending}
                  className="flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-ink/[0.04] disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5">
                    <Avatar name={m.name} src={m.avatar_url} size={28} />
                    <span className="text-ink">{m.name}</span>
                  </span>
                  {pickingId === m.user_id && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
