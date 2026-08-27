'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useSocket } from './useSocket';

const KEYS = {
  list: (filters) => ['notifications', 'list', filters],
  unreadCount: ['notifications', 'unread-count'],
};

export function useNotifications(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, v));
      const qs = params.toString();
      return (await api.get(`/notifications${qs ? `?${qs}` : ''}`)).data.notifications;
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: KEYS.unreadCount,
    queryFn: async () => (await api.get('/notifications/unread-count')).data.count,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => api.delete(`/notifications/${notificationId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Subscribes to the live 'notification:new' event (broadcast to the
 * user's personal socket room — see backend utils/socket.js) and
 * updates the same caches a manual refetch would, so the bell badge and
 * dropdown update without polling. Mount once, near the root (see
 * NotificationBell), not per-page.
 */
export function useLiveNotifications() {
  const { socket } = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket, qc]);
}
