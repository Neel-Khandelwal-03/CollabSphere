'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

const KEYS = {
  list: (filters) => ['tasks', filters],
  forProject: (projectId) => ['tasks', 'project', projectId],
  detail: (id) => ['tasks', id],
  labels: (workspaceId) => ['workspaces', workspaceId, 'labels'],
};

function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useTasks(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => (await api.get(`/tasks${toQueryString(filters)}`)).data,
  });
}

/** Full, unpaginated task list for one project — feeds the Kanban board. */
export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: KEYS.forProject(projectId),
    queryFn: async () => (await api.get(`/tasks?projectId=${projectId}&pageSize=500`)).data.tasks,
    enabled: !!projectId,
  });
}

export function useTask(taskId) {
  return useQuery({
    queryKey: KEYS.detail(taskId),
    queryFn: async () => (await api.get(`/tasks/${taskId}`)).data,
    enabled: !!taskId,
  });
}

function invalidateTaskLists(qc, projectId) {
  qc.invalidateQueries({ queryKey: ['tasks'], exact: false });
  if (projectId) qc.invalidateQueries({ queryKey: KEYS.forProject(projectId) });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/tasks', payload),
    onSuccess: (res) => invalidateTaskLists(qc, res.data.task.project_id),
  });
}

export function useUpdateTask(taskId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put(`/tasks/${taskId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function useDeleteTask(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => invalidateTaskLists(qc, projectId),
  });
}

/**
 * Optimistic drag-and-drop move. Immediately rewrites the cached project
 * task list to reflect the drop target, then fires the PATCH; on failure
 * it rolls back to the pre-drag snapshot via the context returned from
 * onMutate, exactly as React Query's optimistic-update recipe prescribes.
 */
export function useMoveTask(projectId) {
  const qc = useQueryClient();
  const queryKey = KEYS.forProject(projectId);

  return useMutation({
    mutationFn: ({ taskId, status, position }) =>
      api.patch(`/tasks/${taskId}/position`, { status, position }),

    onMutate: async ({ taskId, status, position }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);

      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        const moving = old.find((t) => t.id === taskId);
        if (!moving) return old;

        const withoutMoving = old.filter((t) => t.id !== taskId);
        const destColumn = withoutMoving
          .filter((t) => t.status === status)
          .sort((a, b) => a.position - b.position);
        destColumn.splice(position, 0, { ...moving, status });

        const others = withoutMoving.filter((t) => t.status !== status);
        const reindexedDest = destColumn.map((t, i) => ({ ...t, position: i }));
        return [...others, ...reindexedDest];
      });

      return { previous };
    },

    onError: (err, vars, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous);
    },

    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

export function useChangeTaskStatus(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }) => api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => invalidateTaskLists(qc, projectId),
  });
}

// ---- Comments ----
// (Comments are included directly in useTask()'s response; these hooks
// only cover the mutations.)

export function useCreateComment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment) => api.post(`/tasks/${taskId}/comments`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}

export function useUpdateComment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, comment }) => api.patch(`/tasks/${taskId}/comments/${commentId}`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}

export function useDeleteComment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}

// ---- Attachments ----

export function useUploadAttachment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/tasks/${taskId}/attachments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}

export function useDeleteAttachment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId) => api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}

// ---- Labels ----

export function useWorkspaceLabels(workspaceId) {
  return useQuery({
    queryKey: KEYS.labels(workspaceId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/labels`)).data.labels,
    enabled: !!workspaceId,
  });
}

export function useCreateLabel(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }) => api.post(`/workspaces/${workspaceId}/labels`, { name, color }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.labels(workspaceId) }),
  });
}

export function useAttachLabel(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId) => api.post(`/tasks/${taskId}/labels`, { labelId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}

export function useDetachLabel(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId) => api.delete(`/tasks/${taskId}/labels/${labelId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(taskId) }),
  });
}
