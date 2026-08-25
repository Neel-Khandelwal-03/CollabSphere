'use client';

import { Download, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import FileTypeIcon from './FileTypeIcon';
import { formatFileSize } from '@/lib/utils';

export default function FileList({ files, onPreview, onDelete, canDelete }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.02] text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Size</th>
              <th className="px-4 py-2.5 font-medium">Uploader</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const name = file.original_name || file.file_name;
              const mimeType = file.mime_type || file.file_type;
              const url = file.secure_url || file.file_url;
              return (
                <tr key={file.id} className="border-b border-line/70 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-2.5">
                    <button onClick={() => onPreview(file)} className="flex items-center gap-2.5 text-left">
                      <FileTypeIcon mimeType={mimeType} className="h-4 w-4 shrink-0" />
                      <span className="max-w-[280px] truncate font-medium text-ink">{name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{mimeType?.split('/')[1]?.toUpperCase() || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{formatFileSize(file.file_size)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={file.uploaded_by_name} src={file.uploaded_by_avatar} size={20} />
                      <span className="text-xs text-ink">{file.uploaded_by_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <a href={url} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" title="Open">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a href={url} download={name} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" title="Download">
                        <Download className="h-4 w-4" />
                      </a>
                      {canDelete(file) && (
                        <button onClick={() => onDelete(file)} className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {files.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No files found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
