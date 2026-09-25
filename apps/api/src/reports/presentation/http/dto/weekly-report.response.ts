import { Expose, Type } from 'class-transformer';

class WeeklyReportPeriodResponse {
  @Expose() revenueCents: number;
  @Expose() completedCount: number;
  @Expose() createdCount: number;
  @Expose() cancellationRate: number;
  @Expose() noShowRate: number;
}

class ServiceRankingResponse {
  @Expose() serviceId: string;
  @Expose() name: string;
  @Expose() completedCount: number;
}

class ProfessionalOccupancyResponse {
  @Expose() professionalId: string;
  @Expose() name: string;
  @Expose() scheduledMinutes: number;
  @Expose() workingMinutes: number;
  @Expose() occupancyRate: number | null;
}

class RevenueByWeekdayResponse {
  @Expose() weekday: number;
  @Expose() revenueCents: number;
}

export class WeeklyReportResponse {
  @Expose() weekStart: string;
  @Expose() weekEnd: string;

  @Expose()
  @Type(() => WeeklyReportPeriodResponse)
  current: WeeklyReportPeriodResponse;

  @Expose()
  @Type(() => WeeklyReportPeriodResponse)
  previous: WeeklyReportPeriodResponse;

  @Expose()
  @Type(() => ServiceRankingResponse)
  serviceRanking: ServiceRankingResponse[];

  @Expose()
  @Type(() => ProfessionalOccupancyResponse)
  professionalOccupancy: ProfessionalOccupancyResponse[];

  @Expose()
  @Type(() => RevenueByWeekdayResponse)
  revenueByWeekday: RevenueByWeekdayResponse[];
}
