'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

const KEYS = {
  list: ['workspaces'],
  detail: (id) => ['workspaces', id],
  members: (id) => ['workspaces', id, 'members'],
};

export function useWorkspaces() {
  return useQuery({
    queryKey: KEYS.list,
    queryFn: async () => (await api.get('/workspaces')).data.workspaces,
  });
}

export function useWorkspace(workspaceId) {
  return useQuery({
    queryKey: KEYS.detail(workspaceId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}`)).data,
    enabled: !!workspaceId,
  });
}

export function useWorkspaceMembers(workspaceId) {
  return useQuery({
    queryKey: KEYS.members(workspaceId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/members`)).data.members,
    enabled: !!workspaceId,
  });
}

/**
 * Thin reshape of useWorkspaceMembers for MentionTextarea's candidate
 * format ({id, name, avatarUrl}) — not a new data source, since
 * workspace membership is already exactly who's mentionable in task/
 * issue comments and group chat (the backend enforces the same set
 * server-side via resolveValidMentions). DM mention scoping is narrower
 * (just the other participant) and handled by the caller directly
 * rather than through this hook, since it isn't workspace-membership-based.
 */
export function useMentionableUsers(workspaceId) {
  const { data: members, ...rest } = useWorkspaceMembers(workspaceId);
  return {
    ...rest,
    data: members?.map((m) => ({ id: m.user_id, name: m.name, avatarUrl: m.avatar_url })),
  };
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/workspaces', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useUpdateWorkspace(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put(`/workspaces/${workspaceId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(workspaceId) });
      qc.invalidateQueries({ queryKey: KEYS.list });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId) => api.delete(`/workspaces/${workspaceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useLeaveWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId) => api.post(`/workspaces/${workspaceId}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useInviteMember(workspaceId) {
  return useMutation({
    mutationFn: ({ email, role }) => api.post(`/workspaces/${workspaceId}/invite`, { email, role }),
  });
}

export function useUpdateMemberRole(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }) =>
      api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.members(workspaceId) }),
  });
}

export function useRemoveMember(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.members(workspaceId) });
      qc.invalidateQueries({ queryKey: KEYS.detail(workspaceId) });
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token) => api.post(`/workspaces/invitations/${token}/accept`),
  });
}

export function useRejectInvitation() {
  return useMutation({
    mutationFn: (token) => api.post(`/workspaces/invitations/${token}/reject`),
  });
}
