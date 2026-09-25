export interface WeekPeriodCounts {
  revenueCents: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  totalItemsCount: number;
}

export interface WeekComparisonCounts {
  current: WeekPeriodCounts;
  previous: WeekPeriodCounts;
}

export interface ServiceRankingRow {
  serviceId: string;
  name: string;
  completedCount: number;
}

export interface RevenueByWeekdayRow {
  weekday: number;
  revenueCents: number;
}

export interface ScheduledMinutesRow {
  professionalId: string;
  scheduledMinutes: number;
}

export abstract class AppointmentMetricsReader {
  abstract weekComparisonCounts(
    previousWeekStart: Date,
    currentWeekStart: Date,
    currentWeekEnd: Date,
  ): Promise<WeekComparisonCounts>;

  abstract appointmentsCreatedCounts(
    previousWeekStart: Date,
    currentWeekStart: Date,
    currentWeekEnd: Date,
  ): Promise<{ current: number; previous: number }>;

  abstract serviceRanking(weekStart: Date, weekEnd: Date, limit: number): Promise<ServiceRankingRow[]>;

  abstract revenueByWeekday(weekStart: Date, weekEnd: Date): Promise<RevenueByWeekdayRow[]>;

  abstract scheduledMinutesByProfessional(weekStart: Date, weekEnd: Date): Promise<ScheduledMinutesRow[]>;
}
