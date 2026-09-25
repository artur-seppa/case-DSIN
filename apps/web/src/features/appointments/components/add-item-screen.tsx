import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { formatCents } from '@/shared/utils/money';
import { toSalonDateParam } from '@/shared/utils/date';
import { configQueryOptions } from '@/shared/api/config';
import { toast } from '@/shared/lib/toast';
import { appointmentsLabels } from '@/shared/labels/appointments';
import { bookingLabels } from '@/shared/labels/booking';
import { servicesQueryOptions } from '@/features/catalog/api/services';
import { professionalsQueryOptions } from '@/features/catalog/api/professionals';
import { appointmentDetailQueryOptions } from '@/features/appointments/api/appointment-detail';
import { addItem } from '@/features/appointments/api/add-item';
import { availabilityQueryOptions } from '@/features/booking/api/availability';
import { TimeSlotPicker } from '@/features/appointments/components/time-slot-picker';
import { cn } from '@/shared/lib/cn';
import type { ApiError } from '@/shared/api/errors';

export interface AddItemScreenProps {
  appointmentId: string;
}

export function AddItemScreen({ appointmentId }: AddItemScreenProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: config } = useQuery(configQueryOptions);
  const { data: appointment } = useQuery(appointmentDetailQueryOptions(appointmentId));
  const { data: services, isPending: isPendingServices } = useQuery(servicesQueryOptions);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: professionals } = useQuery({
    ...professionalsQueryOptions(serviceId ?? ''),
    enabled: !!serviceId,
  });

  const dateParam = appointment && config ? toSalonDateParam(appointment.startsAt, config.utcOffsetMinutes) : null;
  const items = serviceId && professionalId ? [{ serviceId, professionalId }] : [];
  const { data: availability, isPending: isLoadingSlots } = useQuery({
    ...availabilityQueryOptions(dateParam ?? '', items, { appointmentId }),
    enabled: !!dateParam && items.length > 0,
  });

  function selectService(id: string) {
    setServiceId(id);
    setProfessionalId(null);
    setSelectedStart(null);
  }

  async function handleConfirm() {
    if (!serviceId || !professionalId || !selectedStart) {
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await addItem(appointmentId, { serviceId, professionalId, startsAt: selectedStart });
      queryClient.setQueryData(appointmentDetailQueryOptions(appointmentId).queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
      toast.success(appointmentsLabels.addItemSuccess);
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

  if (!appointment.canClientChange) {
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

      <h1 className="font-display text-h2 font-semibold text-text-primary">{appointmentsLabels.addItemScreenTitle}</h1>

      <div className="flex flex-col gap-2">
        <p className="text-small text-text-secondary">{appointmentsLabels.chooseServiceHint}</p>
        {isPendingServices ? <p className="text-small text-text-secondary">{bookingLabels.loadingServices}</p> : null}
        {!isPendingServices && services?.length === 0 ? (
          <p className="text-small text-text-secondary">{bookingLabels.emptyServices}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          {services?.map((service) => {
            const isSelected = serviceId === service.id;
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg border border-border bg-bg-surface p-3 text-left',
                  isSelected && 'border-accent-700 bg-accent-100',
                )}
                onClick={() => selectService(service.id)}
              >
                <span className="text-body font-medium text-text-primary">{service.name}</span>
                <span className="text-small text-text-secondary">
                  {service.durationMinutes} {bookingLabels.minutesSuffix} · {formatCents(service.priceCents)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {serviceId ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-item-professional" className="text-small text-text-secondary">
            {bookingLabels.chooseProfessional}
          </label>
          <select
            id="add-item-professional"
            className="h-10 rounded-lg border border-border bg-bg-surface px-3 text-body text-text-primary"
            value={professionalId ?? ''}
            onChange={(event) => {
              setProfessionalId(event.target.value || null);
              setSelectedStart(null);
            }}
          >
            <option value="" disabled>
              {bookingLabels.chooseProfessional}
            </option>
            {professionals?.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {serviceId && professionalId ? (
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
      ) : null}

      <Button type="button" disabled={!selectedStart || isSubmitting} onClick={handleConfirm}>
        {isSubmitting ? appointmentsLabels.addItemSubmitting : appointmentsLabels.addItemConfirm}
      </Button>
    </div>
  );
}
