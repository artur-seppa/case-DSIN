import { queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export interface AvailabilityItem {
  serviceId: string;
  professionalId: string;
}

export interface AvailabilityResult {
  date: string;
  starts: string[];
  sameWeekSuggestion: { date: string; starts: string[] } | null;
}

export interface AvailabilityContext {
  appointmentId?: string;
  excludeItemId?: string;
}

function serializeItems(items: AvailabilityItem[]): string {
  return items.map(({ serviceId, professionalId }) => `${serviceId}:${professionalId}`).join(',');
}

async function fetchAvailability(
  date: string,
  items: AvailabilityItem[],
  context: AvailabilityContext,
): Promise<AvailabilityResult> {
  const { data, response } = await client.GET('/api/availability', {
    params: {
      query: {
        date,
        items: serializeItems(items) as never,
        appointmentId: context.appointmentId,
        excludeItemId: context.excludeItemId,
      },
    },
  });
  if (!response.ok || !data) {
    throw new Error(`AVAILABILITY_${response.status}`);
  }
  return { date: data.date, starts: data.starts, sameWeekSuggestion: data.sameWeekSuggestion ?? null };
}

export function availabilityQueryOptions(
  date: string,
  items: AvailabilityItem[],
  context: AvailabilityContext = {},
) {
  return queryOptions({
    queryKey: ['availability', date, items, context.appointmentId ?? null, context.excludeItemId ?? null],
    queryFn: () => fetchAvailability(date, items, context),
    staleTime: 0,
    enabled: items.length > 0,
  });
}
