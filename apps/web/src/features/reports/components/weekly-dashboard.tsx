import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { configQueryOptions } from '@/shared/api/config';
import { toSalonDateParam, formatSalonDate } from '@/shared/utils/date';
import { formatCents } from '@/shared/utils/money';
import { reportsLabels } from '@/shared/labels/reports';
import { appointmentsLabels } from '@/shared/labels/appointments';
import { weeklyReportQueryOptions } from '@/features/reports/api/weekly-report';
import { IndicatorCard } from '@/features/reports/components/indicator-card';
import { RevenueByWeekdayChart } from '@/features/reports/components/revenue-by-weekday-chart';
import { ServiceRankingList } from '@/features/reports/components/service-ranking-list';
import { ProfessionalOccupancyList } from '@/features/reports/components/professional-occupancy-list';

function addDays(dateParam: string, days: number): string {
  const [year, month, day] = dateParam.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function WeeklyDashboard() {
  const { data: config } = useQuery(configQueryOptions);
  const [weekStart, setWeekStart] = useState<string | null>(null);

  const effectiveWeekStart = weekStart ?? (config ? toSalonDateParam(new Date().toISOString(), config.utcOffsetMinutes) : null);
  const { data: report, isError, refetch } = useQuery({
    ...weeklyReportQueryOptions(effectiveWeekStart ?? ''),
    enabled: !!effectiveWeekStart,
    placeholderData: keepPreviousData,
  });

  if (!config || !effectiveWeekStart) {
    return null;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{appointmentsLabels.loadErrorTitle}</h1>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {appointmentsLabels.loadErrorRetry}
        </Button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h2 font-semibold text-text-primary">{reportsLabels.dashboardTitle}</h1>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setWeekStart(addDays(report.weekStart, -7))}>
            {reportsLabels.previousWeek}
          </Button>
          <span className="text-small text-text-secondary">
            {formatSalonDate(`${report.weekStart}T12:00:00Z`, config.utcOffsetMinutes)} –{' '}
            {formatSalonDate(`${report.weekEnd}T12:00:00Z`, config.utcOffsetMinutes)}
          </span>
          <Button type="button" variant="outline" onClick={() => setWeekStart(addDays(report.weekStart, 7))}>
            {reportsLabels.nextWeek}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <IndicatorCard
          label={reportsLabels.revenue}
          value={formatCents(report.current.revenueCents)}
          current={report.current.revenueCents}
          previous={report.previous.revenueCents}
          invert={false}
        />
        <IndicatorCard
          label={reportsLabels.completed}
          value={String(report.current.completedCount)}
          current={report.current.completedCount}
          previous={report.previous.completedCount}
          invert={false}
        />
        <IndicatorCard
          label={reportsLabels.created}
          value={String(report.current.createdCount)}
          current={report.current.createdCount}
          previous={report.previous.createdCount}
          invert={false}
        />
        <IndicatorCard
          label={reportsLabels.cancellationRate}
          value={`${Math.round(report.current.cancellationRate * 100)}%`}
          current={report.current.cancellationRate}
          previous={report.previous.cancellationRate}
          invert
        />
        <IndicatorCard
          label={reportsLabels.noShowRate}
          value={`${Math.round(report.current.noShowRate * 100)}%`}
          current={report.current.noShowRate}
          previous={report.previous.noShowRate}
          invert
        />
      </div>

      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <h2 className="mb-3 text-body font-medium text-text-primary">{reportsLabels.revenueByWeekdayTitle}</h2>
        <RevenueByWeekdayChart data={report.revenueByWeekday} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <h2 className="mb-3 text-body font-medium text-text-primary">{reportsLabels.serviceRankingTitle}</h2>
          <ServiceRankingList ranking={report.serviceRanking} />
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <h2 className="mb-3 text-body font-medium text-text-primary">{reportsLabels.occupancyTitle}</h2>
          <ProfessionalOccupancyList occupancy={report.professionalOccupancy} />
        </div>
      </div>
    </div>
  );
}
