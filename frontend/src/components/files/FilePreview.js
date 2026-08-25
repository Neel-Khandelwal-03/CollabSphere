'use client';

import { Download, ExternalLink } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FileTypeIcon, { fileTypeLabel } from './FileTypeIcon';
import { formatFileSize } from '@/lib/utils';

function isImage(mimeType) {
  return mimeType?.startsWith('image/');
}
function isPdf(mimeType) {
  return mimeType === 'application/pdf';
}

export default function FilePreview({ open, onClose, file }) {
  if (!file) return null;

  const url = file.secure_url || file.file_url;
  const name = file.original_name || file.file_name;
  const mimeType = file.mime_type || file.file_type;

  return (
    <Modal open={open} onClose={onClose} title={name} className="max-w-3xl">
      <div className="space-y-4">
        {isImage(mimeType) && (
          <div className="flex max-h-[60vh] justify-center overflow-hidden rounded-lg bg-ink/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} className="max-h-[60vh] object-contain" />
          </div>
        )}

        {isPdf(mimeType) && (
          <iframe src={url} title={name} className="h-[60vh] w-full rounded-lg border border-line" />
        )}

        {!isImage(mimeType) && !isPdf(mimeType) && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-ink/[0.02] py-10">
            <FileTypeIcon mimeType={mimeType} className="h-12 w-12" />
            <div className="text-center">
              <p className="font-medium text-ink">{name}</p>
              <p className="text-sm text-muted">
                {fileTypeLabel(mimeType)} · {formatFileSize(file.file_size)}
              </p>
            </div>
            <p className="text-xs text-muted">Preview isn&apos;t available for this file type.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="text-xs text-muted">
            {formatFileSize(file.file_size)} · Uploaded by {file.uploaded_by_name || 'Unknown'}
          </p>
          <div className="flex gap-2">
            <Button as="a" href={url} target="_blank" rel="noreferrer" variant="outline">
              <ExternalLink className="h-4 w-4" /> Open
            </Button>
            <Button as="a" href={url} download={name}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
