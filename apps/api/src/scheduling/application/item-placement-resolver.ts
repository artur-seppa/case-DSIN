import { Injectable } from '@nestjs/common';
import { localDateKey, localDayBounds, zonedPartsOf } from '../../shared/time/utc-offset.js';
import { Clock } from '../../shared/time/clock.js';
import { evaluateChain, type ChainPlacement } from '../domain/rules/availability-calculator.js';
import { AppointmentRepository } from '../domain/appointment.repository.js';
import { chainIssueException, invalidGridStartException } from '../domain/exceptions.js';
import { ProfessionalReader } from './ports/professional-reader.js';
import { SchedulingSettings } from './ports/scheduling-settings.js';

export interface PlaceItemInput {
  professionalId: string;
  durationMinutes: number;
  startsAt: Date;
  excludeItemIds?: string[];
}

@Injectable()
export class ItemPlacementResolver {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly professionals: ProfessionalReader,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
  ) {}

  async resolve(input: PlaceItemInput): Promise<ChainPlacement> {
    // Business rules (working hours, grid) are all in the salon's local time,
    // so convert the requested UTC instant to local wall-clock parts first.
    const localStart = zonedPartsOf(input.startsAt, this.settings.utcOffsetMinutes);
    const localDateKeyOfStart = localDateKey(localStart);
    const startMinuteOfDay = localStart.hour * 60 + localStart.minute;
    if (startMinuteOfDay % this.settings.slotMinutes !== 0) {
      throw invalidGridStartException();
    }

    const { start: dayStart, end: dayEnd } = localDayBounds(localStart, this.settings.utcOffsetMinutes);
    const [workingHoursWindows, busy] = await Promise.all([
      this.professionals.findWorkingHours(input.professionalId),
      this.appointments.findBusyIntervals([input.professionalId], dayStart, dayEnd),
    ]);
    const workingHours = workingHoursWindows.map((window) => ({
      professionalId: input.professionalId,
      ...window,
    }));
    const excluded = new Set(input.excludeItemIds ?? []);

    const result = evaluateChain(
      {
        date: localDateKeyOfStart,
        items: [{ professionalId: input.professionalId, durationMinutes: input.durationMinutes }],
        workingHours,
        busyIntervals: busy
          .filter((interval) => !excluded.has(interval.itemId))
          .map(({ professionalId, startsAt, endsAt }) => ({ professionalId, startsAt, endsAt })),
        now: this.clock.now(),
        utcOffsetMinutes: this.settings.utcOffsetMinutes,
        slotMinutes: this.settings.slotMinutes,
        minLeadMinutes: this.settings.minLeadMinutes,
        maxDaysAhead: this.settings.maxDaysAhead,
      },
      startMinuteOfDay,
    );

    if (result.issue !== null) {
      throw chainIssueException(result.issue);
    }
    return result.placements[0]!;
  }
}
