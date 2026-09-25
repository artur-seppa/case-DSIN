import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCents } from '@/shared/utils/money';
import { bookingLabels } from '@/shared/labels/booking';
import { servicesQueryOptions } from '@/features/catalog/api/services';
import { professionalsQueryOptions } from '@/features/catalog/api/professionals';
import { useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { cn } from '@/shared/lib/cn';

function ProfessionalPicker({ serviceId }: { serviceId: string }) {
  const { state, setProfessional } = useBookingWizard();
  const { data: professionals } = useQuery(professionalsQueryOptions(serviceId));
  const item = state.items.find((entry) => entry.serviceId === serviceId);

  if (!professionals) {
    return null;
  }

  return (
    <select
      aria-label={bookingLabels.chooseProfessional}
      className="h-10 rounded-lg border border-border bg-bg-surface px-3 text-body text-text-primary"
      value={item?.professionalId ?? ''}
      onChange={(event) => {
        const professional = professionals.find((candidate) => candidate.id === event.target.value);
        setProfessional(serviceId, professional?.id ?? null, professional?.name ?? null);
      }}
    >
      <option value="" disabled>
        {bookingLabels.chooseProfessional}
      </option>
      {professionals.map((professional) => (
        <option key={professional.id} value={professional.id}>
          {professional.name}
        </option>
      ))}
    </select>
  );
}

export function StepServices() {
  const { state, toggleService, goToStep } = useBookingWizard();
  const { data: services, isPending } = useQuery(servicesQueryOptions);

  const canContinue =
    state.items.length > 0 && state.items.every((item) => item.professionalId !== null);

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-small text-text-secondary">{bookingLabels.step1Hint}</p>

      <div role="status" className="rounded-lg border border-border border-l-4 border-l-info-700 bg-bg-surface p-3">
        <p className="text-small text-text-primary">{bookingLabels.sameVisitHint}</p>
      </div>

      {isPending ? <p className="text-small text-text-secondary">{bookingLabels.loadingServices}</p> : null}
      {!isPending && services?.length === 0 ? (
        <p className="text-small text-text-secondary">{bookingLabels.emptyServices}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {services?.map((service) => {
          const selected = state.items.some((item) => item.serviceId === service.id);
          return (
            <div
              key={service.id}
              className={cn(
                'flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4',
                selected && 'border-accent-700 bg-accent-100',
              )}
            >
              <button
                type="button"
                className="flex items-center gap-3 text-left"
                onClick={() => toggleService(service)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5 flex-shrink-0 rounded border border-border',
                    selected && 'border-accent-700 bg-accent-700 text-white',
                  )}
                >
                  {selected ? '✓' : null}
                </span>
                <span className="flex-1">
                  <span className="block text-body font-medium text-text-primary">{service.name}</span>
                  <span className="block text-small text-text-secondary">
                    {service.durationMinutes} {bookingLabels.minutesSuffix} · {formatCents(service.priceCents)}
                  </span>
                </span>
              </button>
              {selected ? <ProfessionalPicker serviceId={service.id} /> : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <Button type="button" disabled={!canContinue} onClick={() => goToStep(2)}>
          {bookingLabels.continueButton}
        </Button>
        {!canContinue ? (
          <p className="text-small text-text-secondary">
            {state.items.length === 0
              ? bookingLabels.needAtLeastOneServiceHint
              : bookingLabels.needProfessionalHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
