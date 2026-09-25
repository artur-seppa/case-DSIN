import { formatSalonTime } from '@/shared/utils/date';
import { bookingLabels } from '@/shared/labels/booking';
import { cn } from '@/shared/lib/cn';

export interface TimeSlotPickerProps {
  starts: string[];
  utcOffsetMinutes: number;
  selectedStart: string | null;
  onSelect: (start: string) => void;
  isLoading: boolean;
}

export function TimeSlotPicker({ starts, utcOffsetMinutes, selectedStart, onSelect, isLoading }: TimeSlotPickerProps) {
  if (isLoading) {
    return <p className="text-small text-text-secondary">{bookingLabels.loadingSlots}</p>;
  }

  if (starts.length === 0) {
    return <p className="text-small text-text-secondary">{bookingLabels.noSlotsAvailable}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {starts.map((start) => {
        const isSelected = selectedStart === start;
        return (
          <button
            key={start}
            type="button"
            aria-pressed={isSelected}
            className={cn(
              'rounded-lg border border-border bg-bg-surface py-2.5 text-body',
              isSelected && 'border-accent-700 bg-accent-700 font-medium text-white',
            )}
            onClick={() => onSelect(start)}
          >
            {formatSalonTime(start, utcOffsetMinutes)}
          </button>
        );
      })}
    </div>
  );
}
