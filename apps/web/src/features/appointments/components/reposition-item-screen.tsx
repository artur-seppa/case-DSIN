import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { formatCents } from '@/shared/utils/money';
import { formatSalonTime, toSalonDateParam } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { toast } from '@/shared/lib/toast';
import { appointmentsLabels } from '@/shared/labels/appointments';
import { bookingLabels } from '@/shared/labels/booking';
import { professionalsQueryOptions } from '@/features/catalog/api/professionals';
import { appointmentDetailQueryOptions } from '@/features/appointments/api/appointment-detail';
import { repositionItem } from '@/features/appointments/api/reposition-item';
import { availabilityQueryOptions } from '@/features/booking/api/availability';
import { TimeSlotPicker } from '@/features/appointments/components/time-slot-picker';
import type { ApiError } from '@/shared/api/errors';

export interface RepositionItemScreenProps {
  appointmentId: string;
  itemId: string;
}

export function RepositionItemScreen({ appointmentId, itemId }: RepositionItemScreenProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: config } = useQuery(configQueryOptions);
  const { data: appointment } = useQuery(appointmentDetailQueryOptions(appointmentId));
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const item = appointment?.items.find((candidate) => candidate.id === itemId);

  const { data: professionals } = useQuery({
    ...professionalsQueryOptions(item?.service.id ?? ''),
    enabled: !!item,
  });

  const effectiveProfessionalId = professionalId ?? item?.professional.id ?? null;
  const dateParam = appointment && config ? toSalonDateParam(appointment.startsAt, config.utcOffsetMinutes) : null;
  const availItems = item && effectiveProfessionalId ? [{ serviceId: item.service.id, professionalId: effectiveProfessionalId }] : [];
  const { data: availability, isPending: isLoadingSlots } = useQuery({
    ...availabilityQueryOptions(dateParam ?? '', availItems, { appointmentId, excludeItemId: itemId }),
    enabled: !!dateParam && availItems.length > 0,
  });

  async function handleConfirm() {
    if (!selectedStart) {
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await repositionItem(appointmentId, itemId, {
        startsAt: selectedStart,
        professionalId: professionalId ?? undefined,
      });
      queryClient.setQueryData(appointmentDetailQueryOptions(appointmentId).queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
      toast.success(appointmentsLabels.repositionSuccess);
      navigate({ to: '/appointments/$id', params: { id: appointmentId } });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === 'SLOT_TAKEN') {
        toast.error(bookingLabels.slotTakenTitle, { description: bookingLabels.slotTakenDescription });
        queryClient.invalidateQueries({ queryKey: ['availability'] });
        setSelectedStart(null);
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!config || !appointment) {
    return null;
  }

  const isEligible = appointment.canClientChange && item && (item.status === 'PENDING' || item.status === 'CONFIRMED');

  if (!isEligible) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <h1 className="font-display text-h3 font-semibold text-text-primary">{appointmentsLabels.cannotChangeTitle}</h1>
        <p className="text-small text-text-secondary">{appointmentsLabels.cannotChangeHint}</p>
        <Link to="/appointments/$id" params={{ id: appointmentId }} className="text-small font-medium text-accent-700">
          {appointmentsLabels.backToList}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link to="/appointments/$id" params={{ id: appointmentId }} className="flex items-center gap-1 text-small text-text-secondary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {appointmentsLabels.backToList}
      </Link>

      <h1 className="font-display text-h2 font-semibold text-text-primary">{appointmentsLabels.repositionScreenTitle}</h1>

      <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg-surface p-3">
        <span className="text-body font-medium text-text-primary">{item.service.name}</span>
        <span className="text-small text-text-secondary">
          {formatSalonTime(item.startsAt, config.utcOffsetMinutes)} · {item.professional.name} · {formatCents(item.priceCents)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reposition-professional" className="text-small text-text-secondary">
          {bookingLabels.chooseProfessional}
        </label>
        <select
          id="reposition-professional"
          className="h-10 rounded-lg border border-border bg-bg-surface px-3 text-body text-text-primary"
          value={effectiveProfessionalId ?? ''}
          onChange={(event) => {
            setProfessionalId(event.target.value || null);
            setSelectedStart(null);
          }}
        >
          {professionals?.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-small text-text-secondary">{appointmentsLabels.chooseTimeHint}</p>
        <TimeSlotPicker
          starts={availability?.starts ?? []}
          utcOffsetMinutes={config.utcOffsetMinutes}
          selectedStart={selectedStart}
          onSelect={setSelectedStart}
          isLoading={isLoadingSlots}
        />
      </div>

      <Button type="button" disabled={!selectedStart || isSubmitting} onClick={handleConfirm}>
        {isSubmitting ? appointmentsLabels.repositionSubmitting : appointmentsLabels.repositionConfirm}
      </Button>
    </div>
  );
}
