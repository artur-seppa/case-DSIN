import { Injectable } from '@nestjs/common';
import { localDateKey, localDayBounds, zonedPartsOf } from '../../../shared/time/utc-offset.js';
import { Clock } from '../../../shared/time/clock.js';
import { evaluateChain } from '../../domain/rules/availability-calculator.js';
import { AppointmentItem } from '../../domain/entities/appointment-item.entity.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import {
  AppointmentRepository,
  type AppointmentAggregate,
} from '../../domain/appointment.repository.js';
import { chainIssueException, invalidGridStartException } from '../../domain/exceptions.js';
import { ItemStatus } from '../../domain/rules/item-status.js';
import { OutboxEventType } from '../../domain/entities/outbox-event-type.js';
import { ProfessionalReader } from '../ports/professional-reader.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';
import {
  ResolveAppointmentItemsUseCase,
  type AppointmentItemInput,
} from './resolve-appointment-items.use-case.js';

export interface CreateAppointmentInput {
  clientId: string;
  startsAt: Date;
  notes?: string | null;
  items: AppointmentItemInput[];
}

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly professionals: ProfessionalReader,
    private readonly resolveItems: ResolveAppointmentItemsUseCase,
    private readonly clock: Clock,
    private readonly settings: SchedulingSettings,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<AppointmentAggregate> {
    const resolvedItems = await this.resolveItems.execute(input.items);

    // Business rules (working hours, grid) are all in the salon's local time,
    // so convert the requested UTC instant to local wall-clock parts first.
    const localStart = zonedPartsOf(input.startsAt, this.settings.utcOffsetMinutes);
    const localDateKeyOfStart = localDateKey(localStart);
    const startMinuteOfDay = localStart.hour * 60 + localStart.minute;
    if (startMinuteOfDay % this.settings.slotMinutes !== 0) {
      throw invalidGridStartException();
    }

    const professionalIds = [...new Set(resolvedItems.map((item) => item.professionalId))];
    const { start: dayStart, end: dayEnd } = localDayBounds(localStart, this.settings.utcOffsetMinutes);
    const [workingHours, busyIntervals] = await Promise.all([
      this.professionals.findWorkingHoursByIds(professionalIds),
      this.appointments.findBusyIntervals(professionalIds, dayStart, dayEnd),
    ]);

    const result = evaluateChain(
      {
        date: localDateKeyOfStart,
        items: resolvedItems.map(({ professionalId, durationMinutes }) => ({
          professionalId,
          durationMinutes,
        })),
        workingHours,
        busyIntervals: busyIntervals.map(({ professionalId, startsAt, endsAt }) => ({
          professionalId,
          startsAt,
          endsAt,
        })),
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

    const appointment = Object.assign(new Appointment(), {
      clientId: input.clientId,
      notes: input.notes ?? null,
      reminderSentAt: null,
    });

    const items = result.placements.map((placement, index) => {
      const resolvedItem = resolvedItems[index]!;
      return Object.assign(new AppointmentItem(), {
        appointmentId: appointment.id,
        serviceId: resolvedItem.serviceId,
        professionalId: placement.professionalId,
        startsAt: placement.startsAt,
        endsAt: placement.endsAt,
        priceCents: resolvedItem.priceCents,
        status: ItemStatus.PENDING,
      });
    });

    return this.appointments.create(appointment, items, {
      eventType: OutboxEventType.APPOINTMENT_CREATED,
      payload: { appointmentId: appointment.id },
    });
  }
}
