import createClient from 'openapi-fetch';
import type { paths } from '@/shared/api/schema';
import { createAuthFetch } from '@/shared/api/auth-fetch';
import { createCsrfMiddleware } from '@/shared/api/csrf';
import { queryClient } from '@/app/query-client';

const PATHS_WITHOUT_SESSION_RELOAD = ['/login', '/register'];

export function shouldHardReloadOnSessionExpiry(pathname: string): boolean {
  return !PATHS_WITHOUT_SESSION_RELOAD.includes(pathname);
}

export const client = createClient<paths>({
  baseUrl: '',
  credentials: 'include',
  fetch: createAuthFetch(fetch, () => {
    if (!shouldHardReloadOnSessionExpiry(window.location.pathname)) {
      return;
    }
    queryClient.clear();
    window.location.assign('/login');
  }),
});

client.use(createCsrfMiddleware());
