import { Injectable } from '@nestjs/common';
import { addDaysToLocalDate, localDate, localDateKey } from '../../../shared/time/utc-offset.js';
import { SchedulingSettings } from '../../../scheduling/application/ports/scheduling-settings.js';
import { AppointmentMetricsReader } from '../ports/appointment-metrics-reader.js';
import { ProfessionalOccupancyReader } from '../ports/professional-occupancy-reader.js';
import { weekBoundsContaining } from '../../domain/week-bounds.js';

const SERVICE_RANKING_LIMIT = 10;

export interface WeeklyReportPeriod {
  revenueCents: number;
  completedCount: number;
  createdCount: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface WeeklyReportProfessionalOccupancy {
  professionalId: string;
  name: string;
  scheduledMinutes: number;
  workingMinutes: number;
  occupancyRate: number | null;
}

export interface WeeklyReportResult {
  weekStart: string;
  weekEnd: string;
  current: WeeklyReportPeriod;
  previous: WeeklyReportPeriod;
  serviceRanking: { serviceId: string; name: string; completedCount: number }[];
  professionalOccupancy: WeeklyReportProfessionalOccupancy[];
  revenueByWeekday: { weekday: number; revenueCents: number }[];
}

function rate(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

@Injectable()
export class GetWeeklyReportUseCase {
  constructor(
    private readonly metrics: AppointmentMetricsReader,
    private readonly occupancy: ProfessionalOccupancyReader,
    private readonly settings: SchedulingSettings,
  ) {}

  async execute(weekStartParam: string): Promise<WeeklyReportResult> {
    const bounds = weekBoundsContaining(weekStartParam, this.settings.utcOffsetMinutes);

    const [comparison, created, serviceRanking, revenueByWeekdayRows, scheduledMinutes, workingMinutes] =
      await Promise.all([
        this.metrics.weekComparisonCounts(bounds.previousWeekStartUtc, bounds.currentWeekStartUtc, bounds.currentWeekEndUtc),
        this.metrics.appointmentsCreatedCounts(bounds.previousWeekStartUtc, bounds.currentWeekStartUtc, bounds.currentWeekEndUtc),
        this.metrics.serviceRanking(bounds.currentWeekStartUtc, bounds.currentWeekEndUtc, SERVICE_RANKING_LIMIT),
        this.metrics.revenueByWeekday(bounds.currentWeekStartUtc, bounds.currentWeekEndUtc),
        this.metrics.scheduledMinutesByProfessional(bounds.currentWeekStartUtc, bounds.currentWeekEndUtc),
        this.occupancy.workingMinutesByProfessional(),
      ]);

    const revenueByWeekdayMap = new Map(revenueByWeekdayRows.map((row) => [row.weekday, row.revenueCents]));
    const revenueByWeekday = Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      revenueCents: revenueByWeekdayMap.get(index + 1) ?? 0,
    }));

    const scheduledByProfessional = new Map(scheduledMinutes.map((row) => [row.professionalId, row.scheduledMinutes]));
    const professionalOccupancy = workingMinutes.map(({ professionalId, name, workingMinutes: wm }) => {
      const scheduled = scheduledByProfessional.get(professionalId) ?? 0;
      return {
        professionalId,
        name,
        scheduledMinutes: scheduled,
        workingMinutes: wm,
        occupancyRate: wm > 0 ? scheduled / wm : null,
      };
    });

    const weekStartLocal = localDate(bounds.weekStartKey);

    return {
      weekStart: localDateKey(weekStartLocal),
      weekEnd: localDateKey(addDaysToLocalDate(weekStartLocal, 6)),
      current: {
        revenueCents: comparison.current.revenueCents,
        completedCount: comparison.current.completedCount,
        createdCount: created.current,
        cancellationRate: rate(comparison.current.cancelledCount, comparison.current.totalItemsCount),
        noShowRate: rate(comparison.current.noShowCount, comparison.current.totalItemsCount),
      },
      previous: {
        revenueCents: comparison.previous.revenueCents,
        completedCount: comparison.previous.completedCount,
        createdCount: created.previous,
        cancellationRate: rate(comparison.previous.cancelledCount, comparison.previous.totalItemsCount),
        noShowRate: rate(comparison.previous.noShowCount, comparison.previous.totalItemsCount),
      },
      serviceRanking,
      professionalOccupancy,
      revenueByWeekday,
    };
  }
}
