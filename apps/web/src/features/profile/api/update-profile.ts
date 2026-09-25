import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { ProfileInput } from '@/features/profile/schemas/profile.schema';
import type { Session } from '@/features/auth/api/session';

export async function updateProfile(input: ProfileInput): Promise<Session> {
  const result = await client
    .PATCH('/api/users/me', {
      body: { name: input.name, phone: input.phone ? input.phone : null },
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
