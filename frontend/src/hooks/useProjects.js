'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

const KEYS = {
  mine: (filters) => ['projects', 'mine', filters],
  forWorkspace: (workspaceId, filters) => ['workspaces', workspaceId, 'projects', filters],
  detail: (id) => ['projects', id],
};

function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useProjects(filters = {}) {
  return useQuery({
    queryKey: KEYS.mine(filters),
    queryFn: async () => (await api.get(`/projects${toQueryString(filters)}`)).data.projects,
  });
}

export function useWorkspaceProjects(workspaceId, filters = {}) {
  return useQuery({
    queryKey: KEYS.forWorkspace(workspaceId, filters),
    queryFn: async () =>
      (await api.get(`/workspaces/${workspaceId}/projects${toQueryString(filters)}`)).data.projects,
    enabled: !!workspaceId,
  });
}

export function useProject(projectId) {
  return useQuery({
    queryKey: KEYS.detail(projectId),
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
    enabled: !!projectId,
  });
}

function invalidateProjectLists(qc, workspaceId) {
  qc.invalidateQueries({ queryKey: ['projects', 'mine'] });
  if (workspaceId) qc.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'projects'] });
  qc.invalidateQueries({ queryKey: ['workspaces'] }); // project_count shown on workspace cards
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/projects', payload),
    onSuccess: (res) => invalidateProjectLists(qc, res.data.project.workspace_id),
  });
}

export function useUpdateProject(projectId, workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put(`/projects/${projectId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(projectId) });
      invalidateProjectLists(qc, workspaceId);
    },
  });
}

export function useDeleteProject(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId) => api.delete(`/projects/${projectId}`),
    onSuccess: () => invalidateProjectLists(qc, workspaceId),
  });
}

export function useArchiveProject(projectId, workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(projectId) });
      invalidateProjectLists(qc, workspaceId);
    },
  });
}

export function useRestoreProject(projectId, workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(projectId) });
      invalidateProjectLists(qc, workspaceId);
    },
  });
}

export function useAssignProjectMember(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.post(`/projects/${projectId}/members`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(projectId) }),
  });
}

export function useRemoveProjectMember(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => api.delete(`/projects/${projectId}/members/${memberId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(projectId) }),
  });
}
