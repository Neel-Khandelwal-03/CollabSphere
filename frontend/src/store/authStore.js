import { create } from 'zustand';

/**
 * Deliberately NOT persisted to localStorage/sessionStorage. The access
 * token lives in memory only; a page reload re-derives it by calling
 * /auth/refresh with the httpOnly refresh cookie (see AuthProvider).
 * This keeps the long-lived credential out of reach of XSS-readable storage.
 */
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: 'loading', // 'loading' | 'authenticated' | 'unauthenticated'

  setSession: (user, accessToken) =>
    set({ user, accessToken, status: 'authenticated' }),

  clearSession: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),

  setStatus: (status) => set({ status }),
}));
