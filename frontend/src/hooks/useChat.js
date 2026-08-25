'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

const KEYS = {
  workspaceChat: (workspaceId) => ['chat', 'workspace', workspaceId],
  projectChat: (projectId) => ['chat', 'project', projectId],
  directList: () => ['chat', 'direct'],
  messages: (conversationId) => ['chat', 'conversation', conversationId, 'messages'],
};

/**
 * The live, cache-backed message list for a conversation. Seeded with
 * `initialMessages` (already fetched alongside the conversation itself by
 * useWorkspaceChat/useProjectChat/useStartDirectConversation), then kept
 * current by useSendMessage/useEditMessage/useDeleteMessage and by
 * incoming socket events (see useChatSocket) — all writing to this same
 * query key via setQueryData. staleTime: Infinity because there's no
 * scenario where a background refetch should silently replace it; every
 * update to this list is either a known local mutation or an explicit
 * socket event, never "the cache just felt old."
 */
export function useMessages(conversationId, initialMessages) {
  return useQuery({
    queryKey: KEYS.messages(conversationId),
    queryFn: async () => (await api.get(`/chat/conversations/${conversationId}/messages`)).data.messages,
    enabled: !!conversationId,
    initialData: initialMessages,
    staleTime: Infinity,
  });
}

export function useWorkspaceChat(workspaceId) {
  return useQuery({
    queryKey: KEYS.workspaceChat(workspaceId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/chat`)).data,
    enabled: !!workspaceId,
  });
}

export function useProjectChat(projectId) {
  return useQuery({
    queryKey: KEYS.projectChat(projectId),
    queryFn: async () => (await api.get(`/projects/${projectId}/chat`)).data,
    enabled: !!projectId,
  });
}

export function useDirectConversations() {
  return useQuery({
    queryKey: KEYS.directList(),
    queryFn: async () => (await api.get('/chat/direct')).data.conversations,
  });
}

export function useStartDirectConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }) => api.post('/chat/direct', { workspaceId, userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.directList() }),
  });
}

/**
 * Older messages (infinite-scroll-up). Deliberately not a plain useQuery
 * — the initial page of messages already arrives bundled with the
 * workspace/project/DM-start response above, so this hook only fetches
 * when explicitly asked for an older page, keyed by the message id being
 * paged before.
 */
export function useOlderMessages(conversationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (beforeMessageId) =>
      api.get(`/chat/conversations/${conversationId}/messages?before=${beforeMessageId}&limit=50`),
    onSuccess: (res) => {
      qc.setQueryData(KEYS.messages(conversationId), (old = []) => {
        const existingIds = new Set(old.map((m) => m.id));
        const older = res.data.messages.filter((m) => !existingIds.has(m.id));
        return [...older, ...old];
      });
    },
  });
}

export function useSendMessage(conversationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content) => api.post(`/chat/conversations/${conversationId}/messages`, { content }),
    onSuccess: (res) => {
      qc.setQueryData(KEYS.messages(conversationId), (old = []) => {
        if (old.some((m) => m.id === res.data.message.id)) return old;
        return [...old, res.data.message];
      });
    },
  });
}

export function useEditMessage(conversationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }) =>
      api.patch(`/chat/conversations/${conversationId}/messages/${messageId}`, { content }),
    onSuccess: (res) => {
      qc.setQueryData(KEYS.messages(conversationId), (old = []) =>
        old.map((m) => (m.id === res.data.message.id ? res.data.message : m))
      );
    },
  });
}

export function useDeleteMessage(conversationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`),
    onSuccess: (_res, messageId) => {
      qc.setQueryData(KEYS.messages(conversationId), (old = []) => old.filter((m) => m.id !== messageId));
    },
  });
}

export function useMarkRead(conversationId) {
  return useMutation({
    mutationFn: (messageId) => api.post(`/chat/conversations/${conversationId}/read`, { messageId }),
  });
}

export { KEYS as CHAT_KEYS };
