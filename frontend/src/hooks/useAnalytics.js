'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

function buildQs(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, v));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// staleTime: 60s on all three — analytics are aggregate summaries, not
// live data; refetching on every tab switch would be wasted work for
// numbers that don't meaningfully change second to second. Real-time
// updates for the underlying data (tasks, issues, etc.) already flow
// through their own dedicated queries/sockets elsewhere in the app.
const ANALYTICS_STALE_TIME = 60 * 1000;

export function useDashboardAnalytics(filters = {}) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', filters],
    queryFn: async () => (await api.get(`/analytics/dashboard${buildQs(filters)}`)).data,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useWorkspaceAnalytics(workspaceId, filters = {}) {
  return useQuery({
    queryKey: ['analytics', 'workspace', workspaceId, filters],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/analytics${buildQs(filters)}`)).data,
    enabled: !!workspaceId,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useProjectAnalytics(projectId, filters = {}) {
  return useQuery({
    queryKey: ['analytics', 'project', projectId, filters],
    queryFn: async () => (await api.get(`/projects/${projectId}/analytics${buildQs(filters)}`)).data,
    enabled: !!projectId,
    staleTime: ANALYTICS_STALE_TIME,
  });
}
