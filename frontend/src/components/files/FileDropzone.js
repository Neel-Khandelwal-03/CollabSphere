'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadWithProgress } from '@/lib/uploadWithProgress';

const ACCEPTED = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.zip';

export default function FileDropzone({ workspaceId, projectId, onUploaded }) {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState([]); // [{ id, name, progress, status: 'uploading'|'done'|'error', error }]
  const inputRef = useRef(null);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['files', 'workspace', workspaceId] });
    if (projectId) qc.invalidateQueries({ queryKey: ['files', 'project', projectId] });
  }, [qc, workspaceId, projectId]);

  const uploadOne = useCallback(
    (file) => {
      const queueId = `${file.name}-${Date.now()}-${Math.random()}`;
      setQueue((prev) => [...prev, { id: queueId, name: file.name, progress: 0, status: 'uploading' }]);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      if (projectId) formData.append('projectId', projectId);

      uploadWithProgress('/files', formData, (percent) => {
        setQueue((prev) => prev.map((q) => (q.id === queueId ? { ...q, progress: percent } : q)));
      })
        .then((res) => {
          setQueue((prev) => prev.map((q) => (q.id === queueId ? { ...q, status: 'done', progress: 100 } : q)));
          invalidate();
          onUploaded?.(res.data.file);
          setTimeout(() => setQueue((prev) => prev.filter((q) => q.id !== queueId)), 2000);
        })
        .catch((err) => {
          setQueue((prev) => prev.map((q) => (q.id === queueId ? { ...q, status: 'error', error: err.message } : q)));
        });
    },
    [workspaceId, projectId, invalidate, onUploaded]
  );

  const handleFiles = (fileList) => {
    Array.from(fileList).forEach(uploadOne);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? 'border-brand bg-brand-tint/40' : 'border-line hover:border-brand/50 hover:bg-ink/[0.02]'
        }`}
      >
        <UploadCloud className="h-7 w-7 text-muted" />
        <p className="text-sm font-medium text-ink">Drag and drop files here, or click to browse</p>
        <p className="text-xs text-muted">Images, PDF, DOCX, PPTX, ZIP — up to 15MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {queue.length > 0 && (
        <div className="mt-3 space-y-2">
          {queue.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{q.name}</span>
                  {q.status === 'uploading' && <span className="text-xs text-muted">{q.progress}%</span>}
                </div>
                {q.status === 'uploading' && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${q.progress}%` }} />
                  </div>
                )}
                {q.status === 'error' && <p className="mt-0.5 text-xs text-danger">{q.error || 'Upload failed'}</p>}
              </div>
              {q.status === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" />}
              {q.status === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-danger" />}
              {q.status === 'error' && (
                <button onClick={() => setQueue((prev) => prev.filter((x) => x.id !== q.id))} className="text-muted hover:text-ink">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
