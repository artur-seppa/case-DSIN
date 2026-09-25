import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { LoginInput } from '@/features/auth/schemas/login.schema';
import type { Session } from '@/features/auth/api/session';

export async function login(input: LoginInput): Promise<Session> {
  const result = await client
    .POST('/api/auth/login', { body: input })
    .catch(() => {
      throw networkFailureError();
    });

  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}
