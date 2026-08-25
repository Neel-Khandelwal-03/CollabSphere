'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

const KEYS = {
  mine: (filters) => ['issues', 'mine', filters],
  forProject: (projectId, filters) => ['projects', projectId, 'issues', filters],
  detail: (id) => ['issues', id],
};

function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useIssues(filters = {}, options = {}) {
  return useQuery({
    queryKey: KEYS.mine(filters),
    queryFn: async () => (await api.get(`/issues${toQueryString(filters)}`)).data,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
}

export function useProjectIssues(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: KEYS.forProject(projectId, filters),
    queryFn: async () => (await api.get(`/projects/${projectId}/issues${toQueryString(filters)}`)).data,
    enabled: !!projectId && (options.enabled !== undefined ? options.enabled : true),
  });
}

export function useIssue(issueId) {
  return useQuery({
    queryKey: KEYS.detail(issueId),
    queryFn: async () => (await api.get(`/issues/${issueId}`)).data,
    enabled: !!issueId,
  });
}

function invalidateIssueLists(qc, projectId) {
  qc.invalidateQueries({ queryKey: ['issues', 'mine'] });
  if (projectId) qc.invalidateQueries({ queryKey: ['projects', projectId, 'issues'] });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/issues', payload),
    onSuccess: (res) => invalidateIssueLists(qc, res.data.issue.project_id),
  });
}

export function useUpdateIssue(issueId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put(`/issues/${issueId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(issueId) });
      invalidateIssueLists(qc, projectId);
    },
  });
}

export function useDeleteIssue(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (issueId) => api.delete(`/issues/${issueId}`),
    onSuccess: () => invalidateIssueLists(qc, projectId),
  });
}

export function useChangeIssueStatus(issueId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status) => api.patch(`/issues/${issueId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(issueId) });
      invalidateIssueLists(qc, projectId);
    },
  });
}

export function useChangeIssuePriority(issueId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (priority) => api.patch(`/issues/${issueId}/priority`, { priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(issueId) });
      invalidateIssueLists(qc, projectId);
    },
  });
}

export function useChangeIssueSeverity(issueId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (severity) => api.patch(`/issues/${issueId}/severity`, { severity }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(issueId) });
      invalidateIssueLists(qc, projectId);
    },
  });
}

export function useChangeIssueAssignee(issueId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assigneeId) => api.patch(`/issues/${issueId}/assignee`, { assigneeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(issueId) });
      invalidateIssueLists(qc, projectId);
    },
  });
}

export function useLinkIssueTask(issueId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkedTaskId) => api.patch(`/issues/${issueId}/link-task`, { linkedTaskId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(issueId) });
      invalidateIssueLists(qc, projectId);
    },
  });
}

// ---- Comments ----

export function useCreateIssueComment(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment) => api.post(`/issues/${issueId}/comments`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}

export function useUpdateIssueComment(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, comment }) => api.patch(`/issues/${issueId}/comments/${commentId}`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}

export function useDeleteIssueComment(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => api.delete(`/issues/${issueId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}

// ---- Labels (reuses the Checkpoint 4 workspace label pool) ----

export function useAttachIssueLabel(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId) => api.post(`/issues/${issueId}/labels`, { labelId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}

export function useDetachIssueLabel(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId) => api.delete(`/issues/${issueId}/labels/${labelId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}

// ---- Attachments (mirrors useUploadAttachment/useDeleteAttachment in
// useTasks.js exactly, same plain-fetch-with-FormData pattern) ----

export function useUploadIssueAttachment(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/issues/${issueId}/attachments`,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}

export function useDeleteIssueAttachment(issueId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId) => api.delete(`/issues/${issueId}/attachments/${attachmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(issueId) }),
  });
}
