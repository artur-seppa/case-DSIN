import { queryOptions } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export interface WeeklyReportPeriod {
  revenueCents: number;
  completedCount: number;
  createdCount: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  current: WeeklyReportPeriod;
  previous: WeeklyReportPeriod;
  serviceRanking: { serviceId: string; name: string; completedCount: number }[];
  professionalOccupancy: {
    professionalId: string;
    name: string;
    scheduledMinutes: number;
    workingMinutes: number;
    occupancyRate: number | null;
  }[];
  revenueByWeekday: { weekday: number; revenueCents: number }[];
}

async function fetchWeeklyReport(weekStart: string): Promise<WeeklyReport> {
  const { data, response } = await client.GET('/api/reports/weekly', {
    params: { query: { weekStart } },
  });
  if (!response.ok || !data) {
    throw new Error(`WEEKLY_REPORT_${response.status}`);
  }
  return data;
}

export function weeklyReportQueryOptions(weekStart: string) {
  return queryOptions({
    queryKey: ['reports', 'weekly', weekStart],
    queryFn: () => fetchWeeklyReport(weekStart),
  });
}
