import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { bookingLabels } from '@/shared/labels/booking';
import { configQueryOptions } from '@/shared/api/config';
import { formatSalonTime, formatSalonDate, toDateParam } from '@/shared/utils/date';
import { availabilityQueryOptions } from '@/features/booking/api/availability';
import { useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { cn } from '@/shared/lib/cn';

function nextSevenDays(): Date[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
}

function parseDateParam(dateParam: string): Date {
  const [year, month, day] = dateParam.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function StepSchedule() {
  const { state, setSchedule, goToStep } = useBookingWizard();
  const { data: config } = useQuery(configQueryOptions);
  const days = nextSevenDays();
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    state.date ? parseDateParam(state.date) : days[0]!,
  );
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  const dateParam = toDateParam(selectedDay);
  const items = state.items.map((item) => ({
    serviceId: item.serviceId,
    professionalId: item.professionalId!,
  }));
  const { data: availability, isPending: isLoadingSlots } = useQuery(
    availabilityQueryOptions(dateParam, items),
  );

  if (!config) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-2 overflow-x-auto">
        {days.map((day) => {
          const isSelected = toDateParam(day) === dateParam;
          return (
            <button
              key={toDateParam(day)}
              type="button"
              className={cn(
                'flex min-w-[46px] flex-col items-center gap-0.5 rounded-lg border border-border bg-bg-surface px-2 py-2.5',
                isSelected && 'border-accent-700 bg-accent-700 text-white',
              )}
              onClick={() => {
                setSelectedDay(day);
                setSelectedStart(null);
              }}
            >
              <span className="text-micro">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}</span>
              <span className="text-body font-semibold">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      {availability?.sameWeekSuggestion ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-border border-l-4 border-l-info-700 bg-bg-surface p-3">
          <p className="text-small text-text-primary">
            {bookingLabels.sameWeekSuggestion(
              formatSalonDate(`${availability.sameWeekSuggestion.date}T12:00:00Z`, config.utcOffsetMinutes),
            )}
          </p>
          <button
            type="button"
            className="self-start text-small font-medium text-accent-700"
            onClick={() => {
              setSelectedDay(parseDateParam(availability.sameWeekSuggestion!.date));
              setSelectedStart(null);
            }}
          >
            {bookingLabels.useThisDate}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {isLoadingSlots ? (
          <p className="col-span-3 text-small text-text-secondary">{bookingLabels.loadingSlots}</p>
        ) : availability?.starts.length ? (
          availability.starts.map((start) => (
            <button
              key={start}
              type="button"
              className={cn(
                'rounded-lg border border-border bg-bg-surface py-2.5 text-body',
                selectedStart === start && 'border-accent-700 bg-accent-700 font-medium text-white',
              )}
              onClick={() => setSelectedStart(start)}
            >
              {formatSalonTime(start, config.utcOffsetMinutes)}
            </button>
          ))
        ) : (
          <p className="col-span-3 text-small text-text-secondary">{bookingLabels.noSlotsAvailable}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={!selectedStart}
          onClick={() => {
            if (!selectedStart) return;
            setSchedule(dateParam, selectedStart);
            goToStep(3);
          }}
        >
          {bookingLabels.continueButton}
        </Button>
        <Button type="button" variant="outline" onClick={() => goToStep(1)}>
          {bookingLabels.backButton}
        </Button>
      </div>
    </div>
  );
}
