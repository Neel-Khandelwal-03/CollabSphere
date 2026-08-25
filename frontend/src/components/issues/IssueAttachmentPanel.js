'use client';

import { useRef } from 'react';
import { Paperclip, Trash2, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import FileTypeIcon from '@/components/files/FileTypeIcon';
import { formatFileSize } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUploadIssueAttachment, useDeleteIssueAttachment } from '@/hooks/useIssues';

function isImage(fileType) {
  return fileType?.startsWith('image/');
}

export default function IssueAttachmentPanel({ issueId, attachments, canUpload, canModerate }) {
  const currentUser = useAuthStore((s) => s.user);
  const upload = useUploadIssueAttachment(issueId);
  const remove = useDeleteIssueAttachment(issueId);
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
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={a.file_url} alt={a.file_name} className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-ink/5">
                <FileTypeIcon mimeType={a.file_type} className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{a.file_name}</p>
              <p className="text-xs text-muted">
                {formatFileSize(a.file_size)} · {a.uploaded_by_name || 'Unknown'}
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
