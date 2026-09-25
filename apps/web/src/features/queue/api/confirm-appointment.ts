import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { AppointmentDetail } from '@/features/appointments/api/appointment-detail';

export async function confirmAppointment(id: string): Promise<AppointmentDetail> {
  const result = await client
    .POST('/api/appointments/{id}/confirm', {
      params: { path: { id } },
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
