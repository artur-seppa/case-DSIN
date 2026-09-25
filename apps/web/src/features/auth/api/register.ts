import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { RegisterInput } from '@/features/auth/schemas/register.schema';
import type { Session } from '@/features/auth/api/session';

export async function register(input: RegisterInput): Promise<Session> {
  const result = await client
    .POST('/api/auth/register', {
      body: {
        name: input.name,
        email: input.email,
        phone: input.phone || undefined,
        password: input.password,
      },
    })
    .catch(() => {
      throw networkFailureError();
    });

  const { data, error, response } = result;
  if (!response.ok || !data) {
    throw errorFromBody(response.status, error);
  }
  return data;
}
