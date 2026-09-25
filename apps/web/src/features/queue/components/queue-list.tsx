import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCents } from '@/shared/utils/money';
import { formatSalonDate, formatSalonTime, toSalonDateParam } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { toast } from '@/shared/lib/toast';
import { appointmentStatusInfo } from '@/shared/labels/appointments';
import { queueLabels } from '@/shared/labels/queue';
import { appointmentsInfiniteQueryOptions, type ItemStatus } from '@/features/appointments/api/appointments';
import { confirmAppointment } from '@/features/queue/api/confirm-appointment';
import { cn } from '@/shared/lib/cn';
import type { ApiError } from '@/shared/api/errors';
import type { AppointmentDetail } from '@/features/appointments/api/appointment-detail';

type Tab = 'today' | 'pending' | 'upcoming';

const TAB_ITEM_STATUS: Record<Tab, ItemStatus[] | undefined> = {
  today: undefined,
  pending: ['PENDING'],
  upcoming: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
};

export function QueueList() {
  const [tab, setTab] = useState<Tab>('today');
  const { data: config } = useQuery(configQueryOptions);
  const queryClient = useQueryClient();

  const today = config ? toSalonDateParam(new Date().toISOString(), config.utcOffsetMinutes) : undefined;
  const itemStatus = TAB_ITEM_STATUS[tab];
  const dateRange = tab === 'today' && today ? { from: today, to: today } : undefined;

  const { data, fetchNextPage, hasNextPage, isPending, isError, refetch } = useInfiniteQuery({
    ...appointmentsInfiniteQueryOptions(itemStatus, dateRange),
    enabled: !!config,
  });

  const confirmMutation = useMutation<AppointmentDetail, ApiError, string>({
    mutationFn: (id: string) => confirmAppointment(id),
    onSuccess: () => {
      toast.success(queueLabels.confirmSuccess);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => toast.error(error.message),
  });

  const appointments = data?.pages.flatMap((page) => page.items) ?? [];

  if (!config) {
    return null;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{queueLabels.loadErrorTitle}</h1>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {queueLabels.loadErrorRetry}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-display text-h2 font-semibold text-text-primary">{queueLabels.screenTitle}</h1>

      <div className="flex gap-2">
        {(['today', 'pending', 'upcoming'] as Tab[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={cn(
              'rounded-full border border-border bg-bg-surface px-3.5 py-1.5 text-small',
              tab === candidate && 'border-accent-700 bg-accent-700 text-white',
            )}
            onClick={() => setTab(candidate)}
          >
            {candidate === 'today'
              ? queueLabels.tabToday
              : candidate === 'pending'
                ? queueLabels.tabPending
                : queueLabels.tabUpcoming}
          </button>
        ))}
      </div>

      {isPending ? <p className="text-small text-text-secondary">{queueLabels.loading}</p> : null}
      {!isPending && appointments.length === 0 ? (
        <p className="text-small text-text-secondary">{queueLabels.empty}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {appointments.map((appointment) => {
          const statusInfo = appointmentStatusInfo[appointment.status] ?? { label: appointment.status, variant: 'neutral' as const };
          const title = appointment.items.map((item) => item.service.name).join(' + ');
          const hasPendingItem = appointment.items.some((item) => item.status === 'PENDING');
          return (
            <div key={appointment.id} className="flex flex-col gap-2 rounded-lg border border-border bg-bg-surface p-4">
              <Link to="/admin/queue/$id" params={{ id: appointment.id }} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-h3 font-medium text-text-primary">{appointment.client.name}</h3>
                    <p className="text-small text-text-secondary">{title}</p>
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <p className="text-small text-text-secondary">
                  {formatSalonDate(appointment.startsAt, config.utcOffsetMinutes)} às{' '}
                  {formatSalonTime(appointment.startsAt, config.utcOffsetMinutes)} · {appointment.items[0]?.professional.name}
                </p>
                <p className="text-small font-medium text-text-primary">{formatCents(appointment.totalCents)}</p>
              </Link>
              {hasPendingItem ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(appointment.id)}
                >
                  {confirmMutation.isPending ? queueLabels.confirming : queueLabels.confirm}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {hasNextPage ? (
        <Button type="button" variant="outline" onClick={() => fetchNextPage()}>
          {queueLabels.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
