'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import LabelPill from '@/components/ui/LabelPill';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useWorkspaceLabels, useCreateLabel, useAttachLabel, useDetachLabel } from '@/hooks/useTasks';

const SWATCHES = ['#6E56CF', '#1B8A5A', '#D64545', '#2E7DBF', '#B34AA3', '#B7791F'];

export default function LabelSelector({ taskId, workspaceId, taskLabels, canManage, canCreate }) {
  const { data: workspaceLabels } = useWorkspaceLabels(workspaceId);
  const attachLabel = useAttachLabel(taskId);
  const detachLabel = useDetachLabel(taskId);
  const createLabel = useCreateLabel(workspaceId);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(SWATCHES[0]);

  const attachedIds = new Set(taskLabels.map((l) => l.id));
  const available = (workspaceLabels || []).filter((l) => !attachedIds.has(l.id));

  const handleCreate = () => {
    if (!newName.trim()) return;
    createLabel.mutate(
      { name: newName.trim(), color: newColor },
      {
        onSuccess: (res) => {
          attachLabel.mutate(res.data.label.id);
          setNewName('');
          setShowCreate(false);
        },
      }
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {taskLabels.map((l) => (
          <LabelPill key={l.id} label={l} onRemove={canManage ? () => detachLabel.mutate(l.id) : undefined} />
        ))}
        {taskLabels.length === 0 && <p className="text-sm text-muted">No labels yet.</p>}
      </div>

      {canManage && (
        <div className="mt-2.5 flex items-center gap-2">
          {available.length > 0 && (
            <select
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
              value=""
              onChange={(e) => e.target.value && attachLabel.mutate(e.target.value)}
            >
              <option value="">Add a label...</option>
              {available.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}
          {canCreate && (
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-strong"
            >
              <Plus className="h-3 w-3" /> New label
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-line p-2.5">
          <Input
            placeholder="Label name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 flex-1 text-xs"
          />
          <div className="flex gap-1">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="h-5 w-5 rounded-full ring-offset-2"
                style={{ backgroundColor: c, outline: newColor === c ? `2px solid ${c}` : 'none' }}
              />
            ))}
          </div>
          <Button onClick={handleCreate} loading={createLabel.isPending} className="h-8 px-3 text-xs">
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
