'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Textarea } from '@/components/ui/Select';
import Button from '@/components/ui/Button';

export default function MessageBubble({ message, isOwn, canModerate, onEdit, onDelete, readers }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEdit(message.id, trimmed);
    setEditing(false);
  };

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar name={message.sender_name || 'Deleted user'} src={message.sender_avatar} size={30} />
      <div className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs font-medium text-ink">{message.sender_name || 'Deleted user'}</span>
          <span className="text-[11px] text-muted">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            {message.edited_at && ' · edited'}
          </span>
        </div>

        {editing ? (
          <div className="mt-1 w-full min-w-[220px] space-y-2">
            <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditing(false); setDraft(message.content); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={save}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`mt-1 whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
              isOwn ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-ink/[0.04] text-ink'
            }`}
          >
            {message.content}
          </div>
        )}

        {!editing && (isOwn || canModerate) && (
          <div className="mt-0.5 flex gap-2.5 px-1">
            {isOwn && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] text-muted hover:text-ink">
                <Pencil className="h-2.5 w-2.5" /> Edit
              </button>
            )}
            <button onClick={() => onDelete(message.id)} className="flex items-center gap-1 text-[11px] text-muted hover:text-danger">
              <Trash2 className="h-2.5 w-2.5" /> Delete
            </button>
          </div>
        )}

        {readers && readers.length > 0 && (
          <div className="mt-0.5 flex items-center gap-1 px-1">
            <div className="flex -space-x-1.5">
              {readers.slice(0, 3).map((r) => (
                <Avatar key={r.user_id} name={r.user_name} size={14} className="ring-1 ring-surface" />
              ))}
            </div>
            <span className="text-[10px] text-muted">Seen</span>
          </div>
        )}
      </div>
    </div>
  );
}
