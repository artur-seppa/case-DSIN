import { queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export interface SalonConfig {
  utcOffsetMinutes: number;
  slotMinutes: number;
  minLeadHours: number;
  maxDaysAhead: number;
  changeWindowHours: number;
}

async function fetchConfig(): Promise<SalonConfig> {
  const { data, response } = await client.GET('/api/config');
  if (!response.ok || !data) {
    throw new Error(`CONFIG_${response.status}`);
  }
  return data;
}

export const configQueryOptions = queryOptions({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: Infinity,
});
