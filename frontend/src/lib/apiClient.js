import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiRequestError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let refreshPromise = null;

/**
 * Calls POST /auth/refresh using the httpOnly cookie. De-duplicated so
 * multiple concurrent 401s only trigger one refresh request.
 */
function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed');
        const body = await res.json();
        useAuthStore.getState().setSession(body.data.user, body.data.accessToken);
        return body.data.accessToken;
      })
      .catch((err) => {
        useAuthStore.getState().clearSession();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Core request helper. Attaches the in-memory access token, and on a 401
 * (expired token) transparently refreshes once and retries the request
 * before giving up.
 */
async function request(path, { method = 'GET', body, retry = true } = {}) {
  const accessToken = useAuthStore.getState().accessToken;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && path !== '/auth/refresh') {
    try {
      await refreshAccessToken();
      return request(path, { method, body, retry: false });
    } catch {
      // fall through to normal error handling below
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiRequestError(data?.message || 'Request failed', res.status, data?.details);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { ApiRequestError, refreshAccessToken };
