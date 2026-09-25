import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';
import type { AppointmentDetail } from '@/features/appointments/api/appointment-detail';

export interface RepositionItemInput {
  startsAt: string;
  professionalId?: string;
}

export async function repositionItem(
  appointmentId: string,
  itemId: string,
  input: RepositionItemInput,
): Promise<AppointmentDetail> {
  const result = await client
    .PATCH('/api/appointments/{id}/items/{itemId}', {
      params: { path: { id: appointmentId, itemId } },
      body: { startsAt: input.startsAt, professionalId: input.professionalId },
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
