import { queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export interface AppointmentDetail {
  id: string;
  client: { id: string; name: string; phone: string | null };
  status: string;
  notes: string | null;
  createdAt: string;
  startsAt: string;
  endsAt: string;
  totalCents: number;
  changeDeadline: string | null;
  canClientChange: boolean;
  items: {
    id: string;
    service: { id: string; name: string };
    professional: { id: string; name: string };
    startsAt: string;
    endsAt: string;
    priceCents: number;
    status: string;
  }[];
}

async function fetchAppointmentDetail(id: string): Promise<AppointmentDetail> {
  const { data, response } = await client.GET('/api/appointments/{id}', {
    params: { path: { id } },
  });
  if (!response.ok || !data) {
    throw new Error(`APPOINTMENT_${response.status}`);
  }
  return data;
}

export function appointmentDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['appointments', 'detail', id],
    queryFn: () => fetchAppointmentDetail(id),
  });
}
