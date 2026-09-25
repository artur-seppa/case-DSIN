import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentItem } from '../../../scheduling/domain/entities/appointment-item.entity.js';
import { Appointment } from '../../../scheduling/domain/entities/appointment.entity.js';
import { SchedulingSettings } from '../../../scheduling/application/ports/scheduling-settings.js';
import { zonedPartsOf } from '../../../shared/time/utc-offset.js';
import {
  AppointmentMetricsReader,
  type RevenueByWeekdayRow,
  type ScheduledMinutesRow,
  type ServiceRankingRow,
  type WeekComparisonCounts,
  type WeekPeriodCounts,
} from '../../application/ports/appointment-metrics-reader.js';

const EMPTY_PERIOD: WeekPeriodCounts = {
  revenueCents: 0,
  completedCount: 0,
  cancelledCount: 0,
  noShowCount: 0,
  totalItemsCount: 0,
};

@Injectable()
export class AppointmentMetricsReaderAdapter extends AppointmentMetricsReader {
  constructor(
    @InjectRepository(AppointmentItem)
    private readonly items: Repository<AppointmentItem>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    private readonly settings: SchedulingSettings,
  ) {
    super();
  }

  async weekComparisonCounts(
    previousWeekStart: Date,
    currentWeekStart: Date,
    currentWeekEnd: Date,
  ): Promise<WeekComparisonCounts> {
    const rows: {
      period: 'current' | 'previous';
      revenue_cents: number;
      completed_count: string;
      cancelled_count: string;
      no_show_count: string;
      total_items_count: string;
    }[] = await this.items.manager.query(
      `SELECT
         CASE WHEN starts_at >= $2 THEN 'current' ELSE 'previous' END AS period,
         COALESCE(SUM(price_cents) FILTER (WHERE status = 'COMPLETED'), 0)::int AS revenue_cents,
         COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_count,
         COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show_count,
         COUNT(*) AS total_items_count
       FROM appointment_items
       WHERE starts_at >= $1 AND starts_at < $3
       GROUP BY period`,
      [previousWeekStart, currentWeekStart, currentWeekEnd],
    );

    const byPeriod = new Map(
      rows.map((row) => [
        row.period,
        {
          revenueCents: row.revenue_cents,
          completedCount: Number(row.completed_count),
          cancelledCount: Number(row.cancelled_count),
          noShowCount: Number(row.no_show_count),
          totalItemsCount: Number(row.total_items_count),
        },
      ]),
    );

    return {
      current: byPeriod.get('current') ?? EMPTY_PERIOD,
      previous: byPeriod.get('previous') ?? EMPTY_PERIOD,
    };
  }

  async appointmentsCreatedCounts(
    previousWeekStart: Date,
    currentWeekStart: Date,
    currentWeekEnd: Date,
  ): Promise<{ current: number; previous: number }> {
    const rows: { period: 'current' | 'previous'; count: string }[] = await this.appointments.manager.query(
      `SELECT
         CASE WHEN created_at >= $2 THEN 'current' ELSE 'previous' END AS period,
         COUNT(*) AS count
       FROM appointments
       WHERE created_at >= $1 AND created_at < $3
       GROUP BY period`,
      [previousWeekStart, currentWeekStart, currentWeekEnd],
    );

    const byPeriod = new Map(rows.map((row) => [row.period, Number(row.count)]));
    return { current: byPeriod.get('current') ?? 0, previous: byPeriod.get('previous') ?? 0 };
  }

  async serviceRanking(weekStart: Date, weekEnd: Date, limit: number): Promise<ServiceRankingRow[]> {
    const rows: { service_id: string; name: string; completed_count: string }[] = await this.items.manager.query(
      `SELECT item.service_id, service.name, COUNT(*) AS completed_count
       FROM appointment_items item
       INNER JOIN services service ON service.id = item.service_id
       WHERE item.status = 'COMPLETED' AND item.starts_at >= $1 AND item.starts_at < $2
       GROUP BY item.service_id, service.name
       ORDER BY completed_count DESC
       LIMIT $3`,
      [weekStart, weekEnd, limit],
    );

    return rows.map((row) => ({
      serviceId: row.service_id,
      name: row.name,
      completedCount: Number(row.completed_count),
    }));
  }

  async revenueByWeekday(weekStart: Date, weekEnd: Date): Promise<RevenueByWeekdayRow[]> {
    const rows: { starts_at: Date; price_cents: number }[] = await this.items.manager.query(
      `SELECT starts_at, price_cents
       FROM appointment_items
       WHERE status = 'COMPLETED' AND starts_at >= $1 AND starts_at < $2`,
      [weekStart, weekEnd],
    );

    const byWeekday = new Map<number, number>();
    for (const row of rows) {
      const weekday = zonedPartsOf(row.starts_at, this.settings.utcOffsetMinutes).weekday;
      byWeekday.set(weekday, (byWeekday.get(weekday) ?? 0) + row.price_cents);
    }

    return [...byWeekday.entries()].map(([weekday, revenueCents]) => ({ weekday, revenueCents }));
  }

  async scheduledMinutesByProfessional(weekStart: Date, weekEnd: Date): Promise<ScheduledMinutesRow[]> {
    const rows: { professional_id: string; scheduled_minutes: string }[] = await this.items.manager.query(
      `SELECT professional_id, SUM(EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60)::int AS scheduled_minutes
       FROM appointment_items
       WHERE status <> 'CANCELLED' AND starts_at >= $1 AND starts_at < $2
       GROUP BY professional_id`,
      [weekStart, weekEnd],
    );

    return rows.map((row) => ({
      professionalId: row.professional_id,
      scheduledMinutes: Number(row.scheduled_minutes),
    }));
  }
}
