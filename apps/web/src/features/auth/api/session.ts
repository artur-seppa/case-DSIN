import { queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export interface Session {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'CLIENT' | 'ADMIN';
}

async function fetchSession(): Promise<Session> {
  const { data, response } = await client.GET('/api/auth/me');
  if (!response.ok || !data) {
    throw new Error(`SESSION_${response.status}`);
  }
  return data;
}

export const sessionQueryOptions = queryOptions({
  queryKey: ['auth', 'session'],
  queryFn: fetchSession,
  retry: false,
  staleTime: 60_000,
});
