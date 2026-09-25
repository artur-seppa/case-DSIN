import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCents } from '@/shared/utils/money';
import { formatSalonDate, formatSalonTime } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { appointmentsLabels, appointmentStatusInfo } from '@/shared/labels/appointments';
import { appointmentsInfiniteQueryOptions, type ItemStatus } from '@/features/appointments/api/appointments';
import { cn } from '@/shared/lib/cn';

type Tab = 'upcoming' | 'history' | 'cancelled';

const TAB_ITEM_STATUS: Record<Tab, ItemStatus[] | undefined> = {
  upcoming: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
  history: ['COMPLETED', 'NO_SHOW'],
  cancelled: ['CANCELLED'],
};

export function AppointmentsList() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data: config } = useQuery(configQueryOptions);
  const { data, fetchNextPage, hasNextPage, isPending, isError, refetch } = useInfiniteQuery(
    appointmentsInfiniteQueryOptions(TAB_ITEM_STATUS[tab]),
  );

  const appointments = data?.pages.flatMap((page) => page.items) ?? [];

  if (!config) {
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-display text-h2 font-semibold text-text-primary">{appointmentsLabels.screenTitle}</h1>

      <div className="flex gap-2 overflow-x-auto">
        {(['upcoming', 'history', 'cancelled'] as Tab[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={cn(
              'rounded-full border border-border bg-bg-surface px-3.5 py-1.5 text-small',
              tab === candidate && 'border-accent-700 bg-accent-700 text-white',
            )}
            onClick={() => setTab(candidate)}
          >
            {candidate === 'upcoming'
              ? appointmentsLabels.tabUpcoming
              : candidate === 'history'
                ? appointmentsLabels.tabHistory
                : appointmentsLabels.tabCancelled}
          </button>
        ))}
      </div>

      {isPending ? <p className="text-small text-text-secondary">{appointmentsLabels.loading}</p> : null}
      {!isPending && appointments.length === 0 ? (
        <p className="text-small text-text-secondary">{appointmentsLabels.empty}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {appointments.map((appointment) => {
          const statusInfo = appointmentStatusInfo[appointment.status] ?? { label: appointment.status, variant: 'neutral' as const };
          const title = appointment.items.map((item) => item.service.name).join(' + ');
          return (
            <Link
              key={appointment.id}
              to="/appointments/$id"
              params={{ id: appointment.id }}
              className="flex flex-col gap-2 rounded-lg border border-border bg-bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 font-display text-h3 font-medium text-text-primary">{title}</h3>
                <div className="shrink-0 whitespace-nowrap">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
              </div>
              <p className="text-small text-text-secondary">
                {formatSalonDate(appointment.startsAt, config.utcOffsetMinutes)} às{' '}
                {formatSalonTime(appointment.startsAt, config.utcOffsetMinutes)} · {appointment.items[0]?.professional.name}
              </p>
              <p className="text-small font-medium text-text-primary">{formatCents(appointment.totalCents)}</p>
            </Link>
          );
        })}
      </div>

      {hasNextPage ? (
        <Button type="button" variant="outline" onClick={() => fetchNextPage()}>
          {appointmentsLabels.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
