'use client';

import { useRef } from 'react';
import { Paperclip, Trash2, FileText, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useUploadAttachment, useDeleteAttachment } from '@/hooks/useTasks';

function isImage(fileType) {
  return fileType?.startsWith('image/');
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function AttachmentPanel({ taskId, attachments, canUpload, canModerate }) {
  const currentUser = useAuthStore((s) => s.user);
  const upload = useUploadAttachment(taskId);
  const remove = useDeleteAttachment(taskId);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = '';
  };

  return (
    <div>
      {upload.isError && <Alert variant="danger" className="mb-3">{upload.error.message}</Alert>}

      <div className="space-y-2">
        {attachments.length === 0 && <p className="text-sm text-muted">No attachments yet.</p>}
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
            {isImage(a.file_type) ? (
              <img src={a.file_url} alt={a.file_name} className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-ink/5">
                <FileText className="h-4 w-4 text-muted" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{a.file_name}</p>
              <p className="text-xs text-muted">
                {formatBytes(a.file_size)} · {a.uploaded_by_name || 'Unknown'}
              </p>
            </div>
            <a href={a.file_url} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
              <Download className="h-4 w-4" />
            </a>
            {(a.uploaded_by === currentUser?.id || canModerate) && (
              <button
                onClick={() => remove.mutate(a.id)}
                className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canUpload && (
        <div className="mt-3">
          <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
          <Button variant="outline" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
            <Paperclip className="h-4 w-4" />
            Attach a file
          </Button>
          <p className="mt-1.5 text-xs text-muted">Images, PDF, DOCX, PPTX, ZIP — up to 15MB.</p>
        </div>
      )}
    </div>
  );
}
