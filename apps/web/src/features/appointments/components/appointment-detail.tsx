import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCents } from '@/shared/utils/money';
import { formatSalonDate, formatSalonTime } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { toast } from '@/shared/lib/toast';
import { appointmentsLabels, appointmentStatusInfo, itemStatusInfo } from '@/shared/labels/appointments';
import { appointmentDetailQueryOptions, type AppointmentDetail } from '@/features/appointments/api/appointment-detail';
import { cancelAppointment } from '@/features/appointments/api/cancel-appointment';
import type { ApiError } from '@/shared/api/errors';

export interface AppointmentDetailScreenProps {
  id: string;
}

function changeWindowMessage(appointment: AppointmentDetail, utcOffsetMinutes: number): string | null {
  if (appointment.changeDeadline === null) {
    return null;
  }
  const deadline = `${formatSalonDate(appointment.changeDeadline, utcOffsetMinutes)} ${formatSalonTime(appointment.changeDeadline, utcOffsetMinutes)}`;
  return appointment.canClientChange
    ? appointmentsLabels.changeWindowOpen(deadline)
    : appointmentsLabels.changeWindowClosed(deadline);
}

export function AppointmentDetailScreen({ id }: AppointmentDetailScreenProps) {
  const { data: config } = useQuery(configQueryOptions);
  const { data: appointment, error: detailError, refetch } = useQuery(appointmentDetailQueryOptions(id));
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const isNotFound = detailError instanceof Error && detailError.message === 'APPOINTMENT_404';
  const hasOtherError = detailError !== null && !!detailError && !isNotFound;

  async function handleCancel() {
    setIsCancelling(true);
    try {
      await cancelAppointment(id, cancelReason.trim() || undefined);
      toast.success('Agendamento cancelado');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setConfirmingCancel(false);
      setCancelReason('');
    } catch (error) {
      toast.error((error as ApiError).message);
    } finally {
      setIsCancelling(false);
    }
  }

  if (isNotFound) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{appointmentsLabels.notFoundTitle}</h1>
        <p className="text-small text-text-secondary">{appointmentsLabels.notFoundHint}</p>
        <Link to="/appointments" className="text-small font-medium text-accent-700">
          {appointmentsLabels.backToList}
        </Link>
      </div>
    );
  }

  if (hasOtherError) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{appointmentsLabels.loadErrorTitle}</h1>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {appointmentsLabels.loadErrorRetry}
        </Button>
      </div>
    );
  }

  if (!config || !appointment) {
    return null;
  }

  const statusInfo = appointmentStatusInfo[appointment.status] ?? { label: appointment.status, variant: 'neutral' as const };
  const windowMessage = changeWindowMessage(appointment, config.utcOffsetMinutes);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link to="/appointments" className="flex items-center gap-1 text-small text-text-secondary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {appointmentsLabels.backToList}
      </Link>

      <div className="flex items-center justify-between">
        <span className="text-small text-text-secondary">
          {formatSalonDate(appointment.startsAt, config.utcOffsetMinutes)}
        </span>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4">
        {appointment.items.map((item) => {
          const itemInfo = itemStatusInfo[item.status] ?? { label: item.status, variant: 'neutral' as const };
          const canReposition =
            appointment.canClientChange && (item.status === 'PENDING' || item.status === 'CONFIRMED');
          return (
            <div key={item.id} className="flex justify-between gap-2">
              <div>
                <div className="text-body font-medium text-text-primary">{item.service.name}</div>
                <div className="text-small text-text-secondary">
                  {formatSalonTime(item.startsAt, config.utcOffsetMinutes)} · {item.professional.name}
                </div>
                {canReposition ? (
                  <Link
                    to="/appointments/$id/items/$itemId/reposition"
                    params={{ id, itemId: item.id }}
                    className="text-small font-medium text-accent-700"
                  >
                    {appointmentsLabels.reposition}
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={itemInfo.variant}>{itemInfo.label}</Badge>
                <span className="text-small">{formatCents(item.priceCents)}</span>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between border-t border-border pt-3 text-body font-semibold">
          <span>{appointmentsLabels.totalLabel}</span>
          <span>{formatCents(appointment.totalCents)}</span>
        </div>
      </div>

      {windowMessage ? (
        <div role="status" className="rounded-lg bg-warning-bg p-3">
          <p className="text-small text-warning-800">{windowMessage}</p>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {appointment.canClientChange ? (
          <Button asChild variant="outline">
            <Link to="/appointments/$id/add-item" params={{ id }}>
              {appointmentsLabels.addService}
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled>
            {appointmentsLabels.addService}
          </Button>
        )}

        {confirmingCancel ? (
          <div className="flex flex-col gap-2 rounded-lg bg-bg-page p-3">
            <span className="text-small text-text-primary">{appointmentsLabels.cancelConfirmQuestion}</span>
            <div className="flex flex-col gap-1">
              <label htmlFor="cancel-reason" className="text-small text-text-secondary">
                {appointmentsLabels.cancelReasonLabel}{' '}
                <span className="font-normal">{appointmentsLabels.cancelReasonOptionalHint}</span>
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={appointmentsLabels.cancelReasonPlaceholder}
                maxLength={255}
                disabled={isCancelling}
                className="rounded-lg border border-border bg-bg-surface p-2 text-small text-text-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" disabled={isCancelling} onClick={() => setConfirmingCancel(false)}>
                {appointmentsLabels.cancelConfirmNo}
              </Button>
              <Button type="button" variant="destructive" disabled={isCancelling} onClick={handleCancel}>
                {isCancelling ? appointmentsLabels.cancelling : appointmentsLabels.cancelConfirmYes}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-error-700"
            disabled={!appointment.canClientChange}
            onClick={() => setConfirmingCancel(true)}
          >
            {appointmentsLabels.cancelAppointment}
          </Button>
        )}
      </div>
    </div>
  );
}
