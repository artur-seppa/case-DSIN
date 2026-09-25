import { queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export type AppointmentHistoryAction = 'ITEM_ADDED' | 'ITEM_REPOSITIONED' | 'ITEM_STATUS_CHANGED';

export interface AppointmentHistoryEntry {
  id: string;
  itemId: string;
  actor: { id: string; name: string };
  action: AppointmentHistoryAction;
  changes: Record<string, unknown>;
  occurredAt: string;
}

async function fetchAppointmentHistory(id: string): Promise<AppointmentHistoryEntry[]> {
  const { data, response } = await client.GET('/api/appointments/{id}/history', {
    params: { path: { id } },
  });
  if (!response.ok || !data) {
    throw new Error(`APPOINTMENT_HISTORY_${response.status}`);
  }
  return data;
}

export function appointmentHistoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['appointments', 'history', id],
    queryFn: () => fetchAppointmentHistory(id),
  });
}
