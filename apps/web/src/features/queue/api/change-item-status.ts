import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { AppointmentDetail } from '@/features/appointments/api/appointment-detail';

export type ItemStatusTransition = 'confirmed' | 'in-progress' | 'completed' | 'no-show';

export async function changeItemStatus(
  appointmentId: string,
  itemId: string,
  status: ItemStatusTransition,
): Promise<AppointmentDetail> {
  const result = await client
    .POST('/api/appointments/{id}/items/{itemId}/{status}', {
      params: { path: { id: appointmentId, itemId, status } },
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
