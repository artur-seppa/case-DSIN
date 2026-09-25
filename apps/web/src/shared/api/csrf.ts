import type { Middleware } from 'openapi-fetch';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let cachedToken: string | null = null;
let pendingFetch: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`CSRF_FETCH_${response.status}`);
  }
  const body = (await response.json()) as { csrfToken: string };
  return body.csrfToken;
}

export function __resetCsrfCacheForTests(): void {
  cachedToken = null;
  pendingFetch = null;
}

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }
  if (!pendingFetch) {
    pendingFetch = fetchCsrfToken().finally(() => {
      pendingFetch = null;
    });
  }
  cachedToken = await pendingFetch;
  return cachedToken;
}

export function clearCsrfToken(): void {
  cachedToken = null;
}

export function createCsrfMiddleware(): Middleware {
  return {
    async onRequest({ request }) {
      if (SAFE_METHODS.has(request.method)) {
        return request;
      }
      const token = await getCsrfToken();
      request.headers.set('x-csrf-token', token);
      return request;
    },
    async onResponse({ response }) {
      if (response.status === 403) {
        const body = (await response
          .clone()
          .json()
          .catch(() => null)) as { code?: string } | null;
        if (body?.code === 'CSRF_INVALID') {
          clearCsrfToken();
        }
      }
      return response;
    },
  };
}
