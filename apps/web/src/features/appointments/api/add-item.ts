import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { AppointmentDetail } from '@/features/appointments/api/appointment-detail';

export interface AddItemInput {
  serviceId: string;
  professionalId: string;
  startsAt: string;
}

export async function addItem(appointmentId: string, input: AddItemInput): Promise<AppointmentDetail> {
  const result = await client
    .POST('/api/appointments/{id}/items', {
      params: { path: { id: appointmentId } },
      body: input,
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
