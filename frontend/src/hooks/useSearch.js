'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

export function useSearch(term, { type } = {}) {
  const params = new URLSearchParams({ q: term });
  if (type) params.set('type', type);

  return useQuery({
    queryKey: ['search', term, type],
    queryFn: async () => (await api.get(`/search?${params.toString()}`)).data.results,
    enabled: term.trim().length > 0,
    staleTime: 10 * 1000,
  });
}

const RECENT_KEY = 'collabsphere:recent-searches';
const MAX_RECENT = 8;

/**
 * Recent searches live in localStorage only — never sent to or stored
 * on the server, per the spec's explicit privacy caution against
 * persisting search terms server-side without a genuine requirement.
 */
export function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecentSearch(term) {
  if (typeof window === 'undefined' || !term.trim()) return;
  const existing = getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
  const updated = [term, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
}
