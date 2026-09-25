import { getCsrfToken } from '@/shared/api/csrf';

type FetchLike = typeof fetch;

const AUTH_ENDPOINTS_WITHOUT_REFRESH = ['/api/auth/login', '/api/auth/refresh', '/api/auth/register'];

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export function createAuthFetch(
  baseFetch: FetchLike = fetch,
  onSessionExpired?: () => void,
): FetchLike {
  let refreshPromise: Promise<boolean> | null = null;

  function refreshSession(): Promise<boolean> {
    if (!refreshPromise) {
      refreshPromise = getCsrfToken()
        .then((csrfToken) =>
          baseFetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'x-csrf-token': csrfToken },
          }),
        )
        .then((response) => response.ok)
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  }

  return async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
    const retryInput = input instanceof Request ? input.clone() : input;
    const response = await baseFetch(input, init);
    const isAuthEndpoint = AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) =>
      urlOf(input).includes(path),
    );

    if (response.status !== 401 || isAuthEndpoint) {
      return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      onSessionExpired?.();
      return response;
    }

    return baseFetch(retryInput, init);
  };
}
