import { client } from '@/shared/api/client';
import { errorFromBody, networkFailureError } from '@/shared/api/errors';

export interface CreateAppointmentInput {
  startsAt: string;
  notes: string | undefined;
  items: { serviceId: string; professionalId: string }[];
}

export interface CreatedAppointment {
  id: string;
  status: string;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment> {
  const result = await client
    .POST('/api/appointments', {
      body: {
        startsAt: input.startsAt,
        notes: input.notes,
        items: input.items,
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
