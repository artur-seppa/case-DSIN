import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { bookingLabels } from '@/shared/labels/booking';
import { formatCents } from '@/shared/utils/money';
import { formatSalonTime, formatSalonDate } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { toast } from '@/shared/lib/toast';
import { createAppointment } from '@/features/booking/api/create-appointment';
import { useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import type { ApiError } from '@/shared/api/errors';

export interface StepReviewProps {
  onConfirmed: () => void;
}

function itemStartTimes(items: { durationMinutes: number }[], firstStartsAt: string): string[] {
  let cursor = new Date(firstStartsAt).getTime();
  return items.map((item) => {
    const start = new Date(cursor).toISOString();
    cursor += item.durationMinutes * 60_000;
    return start;
  });
}

export function StepReview({ onConfirmed }: StepReviewProps) {
  const { state, goToStep, setNotes } = useBookingWizard();
  const { data: config } = useQuery(configQueryOptions);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCents = state.items.reduce((sum, item) => sum + item.priceCents, 0);
  const startTimes = itemStartTimes(state.items, state.startsAt!);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await createAppointment({
        startsAt: state.startsAt!,
        notes: state.notes || undefined,
        items: state.items.map((item) => ({
          serviceId: item.serviceId,
          professionalId: item.professionalId!,
        })),
      });
      toast.success(bookingLabels.bookingConfirmedTitle);
      onConfirmed();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === 'SLOT_TAKEN') {
        toast.error(bookingLabels.slotTakenTitle, { description: bookingLabels.slotTakenDescription });
        queryClient.invalidateQueries({
          queryKey: ['availability', state.date!],
        });
        goToStep(2);
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!config) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4">
        <div className="text-micro font-semibold uppercase tracking-wide text-text-secondary">
          {formatSalonDate(state.startsAt!, config.utcOffsetMinutes)}
        </div>
        {state.items.map((item, index) => (
          <div key={item.serviceId} className="flex justify-between gap-2">
            <div>
              <div className="text-body font-medium text-text-primary">{item.serviceName}</div>
              <div className="text-small text-text-secondary">
                {formatSalonTime(startTimes[index]!, config.utcOffsetMinutes)} · {item.professionalName}
              </div>
            </div>
            <span className="text-body">{formatCents(item.priceCents)}</span>
          </div>
        ))}
        <div className="flex justify-between text-body font-semibold">
          <span>{bookingLabels.totalLabel}</span>
          <span>{formatCents(totalCents)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-small font-medium text-text-primary">
          {bookingLabels.notesLabel}{' '}
          <span className="text-text-secondary font-normal">{bookingLabels.notesOptionalHint}</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          maxLength={500}
          placeholder={bookingLabels.notesPlaceholder}
          className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-body text-text-primary"
          value={state.notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" disabled={isSubmitting} onClick={handleConfirm}>
          {isSubmitting ? bookingLabels.confirming : bookingLabels.confirmButton}
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => goToStep(2)}>
          {bookingLabels.backButton}
        </Button>
      </div>
    </div>
  );
}
