import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCents } from '@/shared/utils/money';
import { formatSalonDate, formatSalonTime } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { toast } from '@/shared/lib/toast';
import { appointmentStatusInfo, itemStatusInfo } from '@/shared/labels/appointments';
import { historyActionLabels, queueLabels } from '@/shared/labels/queue';
import { appointmentDetailQueryOptions } from '@/features/appointments/api/appointment-detail';
import { cancelAppointment } from '@/features/appointments/api/cancel-appointment';
import { confirmAppointment } from '@/features/queue/api/confirm-appointment';
import { changeItemStatus, type ItemStatusTransition } from '@/features/queue/api/change-item-status';
import { cancelItem } from '@/features/queue/api/cancel-item';
import { appointmentHistoryQueryOptions } from '@/features/queue/api/appointment-history';
import type { ApiError } from '@/shared/api/errors';
import type { AppointmentDetail } from '@/features/appointments/api/appointment-detail';

export interface QueueDetailProps {
  id: string;
}

const NEXT_TRANSITIONS: Record<string, { status: ItemStatusTransition; label: string }[]> = {
  CONFIRMED: [
    { status: 'in-progress', label: queueLabels.markInProgress },
    { status: 'no-show', label: queueLabels.markNoShow },
  ],
  IN_PROGRESS: [
    { status: 'completed', label: queueLabels.markCompleted },
    { status: 'no-show', label: queueLabels.markNoShow },
  ],
};

export function QueueDetail({ id }: QueueDetailProps) {
  const { data: config } = useQuery(configQueryOptions);
  const { data: appointment, error: detailError, refetch } = useQuery(appointmentDetailQueryOptions(id));
  const { data: history } = useQuery(appointmentHistoryQueryOptions(id));
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  }

  const confirmMutation = useMutation<AppointmentDetail, ApiError, void>({
    mutationFn: () => confirmAppointment(id),
    onSuccess: () => {
      toast.success(queueLabels.confirmSuccess);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const transitionMutation = useMutation<AppointmentDetail, ApiError, { itemId: string; status: ItemStatusTransition }>({
    mutationFn: ({ itemId, status }) => changeItemStatus(id, itemId, status),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  const cancelItemMutation = useMutation<AppointmentDetail, ApiError, string>({
    mutationFn: (itemId: string) => cancelItem(id, itemId),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  const cancelMutation = useMutation<AppointmentDetail, ApiError, void>({
    mutationFn: () => cancelAppointment(id, cancelReason.trim() || undefined),
    onSuccess: () => {
      toast.success('Agendamento cancelado');
      invalidate();
      setConfirmingCancel(false);
      setCancelReason('');
    },
    onError: (error) => toast.error(error.message),
  });

  const isNotFound = detailError instanceof Error && detailError.message === 'APPOINTMENT_404';
  const hasOtherError = detailError !== null && !!detailError && !isNotFound;

  if (isNotFound) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{queueLabels.notFoundTitle}</h1>
        <Link to="/admin/queue" className="text-small font-medium text-accent-700">
          {queueLabels.backToQueue}
        </Link>
      </div>
    );
  }

  if (hasOtherError) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{queueLabels.loadErrorTitle}</h1>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {queueLabels.loadErrorRetry}
        </Button>
      </div>
    );
  }

  if (!config || !appointment) {
    return null;
  }

  const statusInfo = appointmentStatusInfo[appointment.status] ?? { label: appointment.status, variant: 'neutral' as const };
  const hasPendingItem = appointment.items.some((item) => item.status === 'PENDING');

  return (
    <div className="flex flex-col gap-4 p-6">
      <Link to="/admin/queue" className="flex items-center gap-1 text-small text-text-secondary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {queueLabels.backToQueue}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-h2 font-semibold text-text-primary">{appointment.client.name}</h1>
          <span className="text-small text-text-secondary">
            {formatSalonDate(appointment.startsAt, config.utcOffsetMinutes)}
          </span>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4">
        {appointment.items.map((item) => {
          const itemInfo = itemStatusInfo[item.status] ?? { label: item.status, variant: 'neutral' as const };
          const nextActions = NEXT_TRANSITIONS[item.status] ?? [];
          const canCancelItem = item.status === 'PENDING' || item.status === 'CONFIRMED';
          return (
            <div key={item.id} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="text-body font-medium text-text-primary">{item.service.name}</div>
                  <div className="text-small text-text-secondary">
                    {formatSalonTime(item.startsAt, config.utcOffsetMinutes)} · {item.professional.name}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={itemInfo.variant}>{itemInfo.label}</Badge>
                  <span className="text-small">{formatCents(item.priceCents)}</span>
                </div>
              </div>
              {nextActions.length > 0 || canCancelItem ? (
                <div className="flex flex-wrap gap-2">
                  {nextActions.map((action) => (
                    <Button
                      key={action.status}
                      type="button"
                      variant="outline"
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate({ itemId: item.id, status: action.status })}
                    >
                      {action.label}
                    </Button>
                  ))}
                  {canCancelItem ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-error-700"
                      disabled={cancelItemMutation.isPending}
                      onClick={() => cancelItemMutation.mutate(item.id)}
                    >
                      {queueLabels.cancelItem}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="flex justify-between border-t border-border pt-3 text-body font-semibold">
          <span>{queueLabels.totalLabel}</span>
          <span>{formatCents(appointment.totalCents)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg-surface p-4">
        <h2 className="text-body font-medium text-text-primary">{queueLabels.timelineTitle}</h2>
        {!history || !Array.isArray(history) || history.length === 0 ? (
          <p className="text-small text-text-secondary">{queueLabels.timelineEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...history]
              .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
              .map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-small font-medium text-text-primary">
                    {historyActionLabels[entry.action] ?? entry.action}
                  </span>
                  <span className="text-small text-text-secondary">
                    {entry.actor.name} · {formatSalonDate(entry.occurredAt, config.utcOffsetMinutes)} às{' '}
                    {formatSalonTime(entry.occurredAt, config.utcOffsetMinutes)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {hasPendingItem ? (
          <Button type="button" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? queueLabels.confirming : queueLabels.confirm}
          </Button>
        ) : null}

        {confirmingCancel ? (
          <div className="flex flex-col gap-2 rounded-lg bg-bg-page p-3">
            <span className="text-small text-text-primary">{queueLabels.cancelConfirmQuestion}</span>
            <div className="flex flex-col gap-1">
              <label htmlFor="admin-cancel-reason" className="text-small text-text-secondary">
                {queueLabels.cancelReasonLabel}{' '}
                <span className="font-normal">{queueLabels.cancelReasonOptionalHint}</span>
              </label>
              <textarea
                id="admin-cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={queueLabels.cancelReasonPlaceholder}
                maxLength={255}
                disabled={cancelMutation.isPending}
                className="rounded-lg border border-border bg-bg-surface p-2 text-small text-text-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" disabled={cancelMutation.isPending} onClick={() => setConfirmingCancel(false)}>
                {queueLabels.cancelConfirmNo}
              </Button>
              <Button type="button" variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                {cancelMutation.isPending ? queueLabels.cancelling : queueLabels.cancelConfirmYes}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" className="text-error-700" onClick={() => setConfirmingCancel(true)}>
            {queueLabels.cancelAppointment}
          </Button>
        )}
      </div>
    </div>
  );
}
