import { Injectable } from '@nestjs/common';
import {
  localDate,
  localDateKey,
  localDayBounds,
  zonedPartsOf,
} from '../../../shared/time/utc-offset.js';
import { Clock } from '../../../shared/time/clock.js';
import { calculateAvailability, type WorkingWindow } from '../../domain/rules/availability-calculator.js';
import { findSameWeekDate } from '../../domain/rules/same-week-suggester.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import { ProfessionalReader } from '../ports/professional-reader.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';
import {
  ResolveAppointmentItemsUseCase,
  type AppointmentItemInput,
  type ResolvedAppointmentItem,
} from './resolve-appointment-items.use-case.js';

export interface AvailabilityInput {
  date: string;
  items: AppointmentItemInput[];
  excludeItemId?: string;
  suggestSameWeekForClientId?: string;
}

export interface AvailabilityResult {
  date: string;
  starts: Date[];
  sameWeekSuggestion: { date: string; starts: Date[] } | null;
}

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly professionals: ProfessionalReader,
    private readonly resolveItems: ResolveAppointmentItemsUseCase,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
  ) {}

  async execute(input: AvailabilityInput): Promise<AvailabilityResult> {
    const resolvedItems = await this.resolveItems.execute(input.items);
    const professionalIds = [...new Set(resolvedItems.map((item) => item.professionalId))];
    const workingHours: WorkingWindow[] =
      await this.professionals.findWorkingHoursByIds(professionalIds);

    const starts = await this.availabilityFor(
      input.date,
      resolvedItems,
      workingHours,
      input.excludeItemId,
    );

    let sameWeekSuggestion: { date: string; starts: Date[] } | null = null;
    if (input.suggestSameWeekForClientId) {
      const otherDates = await this.appointments.findClientAppointmentDates(
        input.suggestSameWeekForClientId,
        this.clock.now(),
      );
      const suggestedDate = findSameWeekDate(
        input.date,
        otherDates.map((entry) => localDateKey(zonedPartsOf(entry.startsAt, this.settings.utcOffsetMinutes))),
      );
      if (suggestedDate) {
        const suggestionStarts = await this.availabilityFor(suggestedDate, resolvedItems, workingHours);
        if (suggestionStarts.length > 0) {
          sameWeekSuggestion = { date: suggestedDate, starts: suggestionStarts };
        }
      }
    }

    return { date: input.date, starts, sameWeekSuggestion };
  }

  private async availabilityFor(
    date: string,
    items: ResolvedAppointmentItem[],
    workingHours: WorkingWindow[],
    excludeItemId?: string,
  ): Promise<Date[]> {
    const professionalIds = [...new Set(items.map((item) => item.professionalId))];

    const { start: dayStart, end: dayEnd } = localDayBounds(localDate(date), this.settings.utcOffsetMinutes);
    const busy = await this.appointments.findBusyIntervals(professionalIds, dayStart, dayEnd);

    return calculateAvailability({
      date,
      items: items.map(({ professionalId, durationMinutes }) => ({
        professionalId,
        durationMinutes,
      })),
      workingHours,
      busyIntervals: busy
        .filter((interval) => interval.itemId !== excludeItemId)
        .map(({ professionalId, startsAt, endsAt }) => ({ professionalId, startsAt, endsAt })),
      now: this.clock.now(),
      utcOffsetMinutes: this.settings.utcOffsetMinutes,
      slotMinutes: this.settings.slotMinutes,
      minLeadMinutes: this.settings.minLeadMinutes,
      maxDaysAhead: this.settings.maxDaysAhead,
    });
  }
}
