'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, Check, X, Download } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Textarea } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import FileTypeIcon from '@/components/files/FileTypeIcon';
import MentionText from '@/components/mentions/MentionText';
import { formatFileSize } from '@/lib/utils';

function isImage(mimeType) {
  return mimeType?.startsWith('image/');
}

export default function MessageBubble({ message, isOwn, canModerate, onEdit, onDelete, readers, onPreviewFile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEdit(message.id, trimmed);
    setEditing(false);
  };

  // A caption is only worth showing separately from the file itself if
  // it's not just the filename the backend defaulted to when no real
  // caption was typed (see chat.controller.js's createFileMessage) —
  // otherwise every plain file share would redundantly show "diagram.png"
  // as both a text bubble and the file card below it.
  const hasFile = !!message.file_id;
  const hasRealCaption = hasFile && message.content && message.content !== message.file_name;

  const openPreview = () =>
    onPreviewFile?.({
      secure_url: message.file_url,
      original_name: message.file_name,
      mime_type: message.file_type,
      file_size: message.file_size,
      uploaded_by_name: message.sender_name,
    });

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
          <>
            {(hasRealCaption || !hasFile) && (
              <div
                className={`mt-1 whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                  isOwn ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-ink/[0.04] text-ink'
                }`}
              >
                <MentionText
                  text={message.content}
                  mentionClassName={
                    isOwn
                      ? 'rounded bg-white/25 px-1 py-0.5 font-medium'
                      : 'rounded bg-brand-tint px-1 py-0.5 font-medium text-brand-strong'
                  }
                />
              </div>
            )}

            {hasFile && isImage(message.file_type) && (
              <button onClick={openPreview} className="mt-1 max-w-[240px] overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={message.file_url} alt={message.file_name} className="max-h-56 w-full object-cover" loading="lazy" />
              </button>
            )}

            {hasFile && !isImage(message.file_type) && (
              <button
                onClick={openPreview}
                className="mt-1 flex w-full min-w-[220px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-left hover:bg-ink/[0.02]"
              >
                <FileTypeIcon mimeType={message.file_type} className="h-6 w-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{message.file_name}</p>
                  <p className="text-xs text-muted">{formatFileSize(message.file_size)}</p>
                </div>
                <Download className="h-4 w-4 shrink-0 text-muted" />
              </button>
            )}
          </>
        )}

        {!editing && (isOwn || canModerate) && (
          <div className="mt-0.5 flex gap-2.5 px-1">
            {isOwn && !hasFile && (
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
