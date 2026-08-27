'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useSocket } from './useSocket';

function buildQs(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, v));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useWorkspaceActivity(workspaceId, filters = {}) {
  return useQuery({
    queryKey: ['activity', 'workspace', workspaceId, filters],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/activity${buildQs(filters)}`)).data.activity,
    enabled: !!workspaceId,
  });
}

export function useProjectActivity(projectId, filters = {}) {
  return useQuery({
    queryKey: ['activity', 'project', projectId, filters],
    queryFn: async () => (await api.get(`/projects/${projectId}/activity${buildQs(filters)}`)).data.activity,
    enabled: !!projectId,
  });
}

/**
 * Subscribes to the live 'activity:new' event. The payload matches
 * activityLog.service.js's log() input shape directly (camelCase
 * workspaceId/projectId, not the snake_case DB column names) since the
 * backend broadcasts the same object it was called with, not a
 * re-fetched row.
 */
export function useLiveActivity(workspaceId) {
  const { socket } = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket || !workspaceId) return undefined;
    const onNew = (activity) => {
      if (activity.workspaceId !== workspaceId) return;
      qc.invalidateQueries({ queryKey: ['activity', 'workspace', workspaceId] });
      if (activity.projectId) {
        qc.invalidateQueries({ queryKey: ['activity', 'project', activity.projectId] });
      }
    };
    socket.on('activity:new', onNew);
    return () => socket.off('activity:new', onNew);
  }, [socket, workspaceId, qc]);
}
