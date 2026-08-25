'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { uploadWithProgress } from '@/lib/uploadWithProgress';

const KEYS = {
  workspace: (workspaceId, filters) => ['files', 'workspace', workspaceId, filters],
  project: (projectId, filters) => ['files', 'project', projectId, filters],
  detail: (fileId) => ['files', fileId],
};

export function useWorkspaceFiles(workspaceId, filters = {}) {
  return useQuery({
    queryKey: KEYS.workspace(workspaceId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const qs = params.toString();
      return (await api.get(`/workspaces/${workspaceId}/files${qs ? `?${qs}` : ''}`)).data;
    },
    enabled: !!workspaceId,
  });
}

export function useProjectFiles(projectId, filters = {}) {
  return useQuery({
    queryKey: KEYS.project(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const qs = params.toString();
      return (await api.get(`/projects/${projectId}/files${qs ? `?${qs}` : ''}`)).data;
    },
    enabled: !!projectId,
  });
}

export function useFile(fileId) {
  return useQuery({
    queryKey: KEYS.detail(fileId),
    queryFn: async () => (await api.get(`/files/${fileId}`)).data.file,
    enabled: !!fileId,
  });
}

/**
 * Upload with live progress. Returns the mutation plus a `progress`
 * value and a `cancel()` function — deliberately not a plain useMutation
 * wrapping a fetch call, since progress/cancel both need direct access
 * to the underlying XMLHttpRequest (see uploadWithProgress.js).
 */
export function useUploadFile({ workspaceId, projectId, onProgress }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      if (projectId) formData.append('projectId', projectId);
      return uploadWithProgress('/files', formData, onProgress);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', 'workspace', workspaceId] });
      if (projectId) qc.invalidateQueries({ queryKey: ['files', 'project', projectId] });
    },
  });
}

export function useDeleteFile({ workspaceId, projectId }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId) => api.delete(`/files/${fileId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', 'workspace', workspaceId] });
      if (projectId) qc.invalidateQueries({ queryKey: ['files', 'project', projectId] });
    },
  });
}

// Note on downloading: there is no downloadFileUrl() helper here.
// file.secure_url is already only ever visible in an authorized API
// response (workspace/project file list, or this file's own detail
// fetch) — the same pattern AttachmentPanel.js established for task
// attachments back in Checkpoint 4. A plain <a href> or window.open()
// can't attach an Authorization header, so linking directly to
// secure_url is both simpler and the only one that actually works from
// a browser; the backend's authenticated GET /files/:id/download
// redirect exists for non-browser API consumers that can set the header
// themselves (curl, scripts), not for this frontend's own links.
