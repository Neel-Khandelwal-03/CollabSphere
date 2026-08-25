'use client';

import { useMutation } from '@tanstack/react-query';
import { api, refreshAccessToken } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ name, email, password }) =>
      api.post('/auth/register', { name, email, password }),
    onSuccess: (res) => setSession(res.data.user, res.data.accessToken),
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ email, password }) => api.post('/auth/login', { email, password }),
    onSuccess: (res) => setSession(res.data.user, res.data.accessToken),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => clearSession(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }) => api.post('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }) => api.post('/auth/reset-password', { token, password }),
  });
}

/**
 * Attempts a silent session restore on app load using the httpOnly
 * refresh cookie. Called once from AuthProvider.
 */
export async function restoreSession() {
  try {
    await refreshAccessToken();
  } catch {
    useAuthStore.getState().clearSession();
  }
}
