'use client';

import { Download, Trash2, ExternalLink } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import FileTypeIcon from './FileTypeIcon';
import { formatFileSize } from '@/lib/utils';

function isImage(mimeType) {
  return mimeType?.startsWith('image/');
}

export default function FileCard({ file, onPreview, onDelete, canDelete }) {
  const name = file.original_name || file.file_name;
  const mimeType = file.mime_type || file.file_type;
  const url = file.secure_url || file.file_url;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md">
      <button onClick={() => onPreview(file)} className="flex h-32 w-full items-center justify-center bg-ink/[0.03]">
        {isImage(mimeType) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <FileTypeIcon mimeType={mimeType} className="h-10 w-10" />
        )}
      </button>

      <div className="flex-1 p-3">
        <p className="truncate text-sm font-medium text-ink" title={name}>{name}</p>
        <p className="mt-0.5 text-xs text-muted">{formatFileSize(file.file_size)}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar name={file.uploaded_by_name} src={file.uploaded_by_avatar} size={16} />
          <span className="truncate text-xs text-muted">{file.uploaded_by_name || 'Unknown'}</span>
        </div>
        {file.source_type && file.source_type !== 'general' && (
          <p className="mt-1 truncate text-[11px] text-muted">
            via {file.source_type === 'task' ? 'Task' : 'Issue'}: {file.source_title}
          </p>
        )}
      </div>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-surface/90 p-1.5 text-muted shadow-sm hover:text-ink"
          title="Open"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href={url}
          download={name}
          className="rounded-md bg-surface/90 p-1.5 text-muted shadow-sm hover:text-ink"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        {canDelete && (
          <button
            onClick={() => onDelete(file)}
            className="rounded-md bg-surface/90 p-1.5 text-muted shadow-sm hover:text-danger"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
