import { NotFoundException } from '@nestjs/common';
import { Clock } from '../../../shared/time/clock.js';
import { AppointmentRepository } from '../../domain/appointment.repository.js';
import {
  SchedulingRuleViolationException,
  SlotTakenException,
} from '../../domain/exceptions.js';
import { AppointmentStatus } from '../../domain/appointment-status.js';
import { ProfessionalReader } from '../ports/professional-reader.js';
import { ServiceReader } from '../ports/service-reader.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';
import { CreateAppointmentUseCase } from './create-appointment.use-case.js';
import { GetAvailabilityUseCase } from './get-availability.use-case.js';
import { ResolveAppointmentItemsUseCase } from './resolve-appointment-items.use-case.js';

const SETTINGS: SchedulingSettings = {
  utcOffsetMinutes: -180,
  slotMinutes: 30,
  minLeadMinutes: 120,
  maxDaysAhead: 60,
  changeWindowHours: 48,
};

describe('ResolveAppointmentItemsUseCase', () => {
  function setup() {
    const services = { findByIds: vi.fn<ServiceReader['findByIds']>().mockResolvedValue([]) };
    const professionals = {
      findByIds: vi.fn<ProfessionalReader['findByIds']>().mockResolvedValue([]),
      offersService: vi.fn<ProfessionalReader['offersService']>(),
    };
    const useCase = new ResolveAppointmentItemsUseCase(
      services as unknown as ServiceReader,
      professionals as unknown as ProfessionalReader,
    );
    return { services, professionals, useCase };
  }

  it('resolves each item with the current duration and price snapshot', async () => {
    const { services, professionals, useCase } = setup();
    services.findByIds.mockResolvedValue([
      { id: 'S1', name: 'Corte', durationMinutes: 45, priceCents: 6000, active: true },
    ]);
    professionals.findByIds.mockResolvedValue([{ id: 'P1', name: 'Ana', active: true }]);
    professionals.offersService.mockResolvedValue(true);

    const resolved = await useCase.execute([{ serviceId: 'S1', professionalId: 'P1' }]);

    expect(resolved).toEqual([
      { serviceId: 'S1', professionalId: 'P1', durationMinutes: 45, priceCents: 6000 },
    ]);
  });

  it('fails when the service does not exist or is inactive', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute([{ serviceId: 'GHOST', professionalId: 'P1' }]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails when the professional does not exist or is inactive', async () => {
    const { services, useCase } = setup();
    services.findByIds.mockResolvedValue([
      { id: 'S1', name: 'Corte', durationMinutes: 45, priceCents: 6000, active: true },
    ]);

    await expect(
      useCase.execute([{ serviceId: 'S1', professionalId: 'GHOST' }]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails when the professional does not offer the service', async () => {
    const { services, professionals, useCase } = setup();
    services.findByIds.mockResolvedValue([
      { id: 'S1', name: 'Corte', durationMinutes: 45, priceCents: 6000, active: true },
    ]);
    professionals.findByIds.mockResolvedValue([{ id: 'P1', name: 'Ana', active: true }]);
    professionals.offersService.mockResolvedValue(false);

    await expect(
      useCase.execute([{ serviceId: 'S1', professionalId: 'P1' }]),
    ).rejects.toBeInstanceOf(SchedulingRuleViolationException);
  });
});

describe('GetAvailabilityUseCase', () => {
  function setup() {
    const appointments = {
      findBusyIntervals: vi
        .fn<AppointmentRepository['findBusyIntervals']>()
        .mockResolvedValue([]),
      findClientAppointmentDates: vi.fn<AppointmentRepository['findClientAppointmentDates']>(),
    };
    const professionals = {
      findWorkingHoursByIds: vi.fn<ProfessionalReader['findWorkingHoursByIds']>().mockResolvedValue([
        { professionalId: 'P1', weekday: 3, startTime: '09:00', endTime: '18:00' },
        { professionalId: 'P1', weekday: 7, startTime: '00:00', endTime: '23:30' },
      ]),
    };
    const resolveItems = {
      execute: vi
        .fn<ResolveAppointmentItemsUseCase['execute']>()
        .mockResolvedValue([
          { serviceId: 'S1', professionalId: 'P1', durationMinutes: 30, priceCents: 5000 },
        ]),
    };
    const clock = { now: vi.fn<Clock['now']>().mockReturnValue(new Date('2026-09-01T00:00:00Z')) };
    const useCase = new GetAvailabilityUseCase(
      appointments as unknown as AppointmentRepository,
      professionals as unknown as ProfessionalReader,
      resolveItems as unknown as ResolveAppointmentItemsUseCase,
      clock as unknown as Clock,
      SETTINGS,
    );
    return { appointments, professionals, resolveItems, clock, useCase };
  }

  it('returns the starts calculated for the resolved items on the requested date', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      date: '2026-09-30',
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    expect(result.date).toBe('2026-09-30');
    expect(result.starts.length).toBeGreaterThan(0);
    expect(result.sameWeekSuggestion).toBeNull();
  });

  it('matches the same-week suggestion by the local calendar date, not the UTC one', async () => {
    const { appointments, useCase } = setup();
    // 2026-10-05T02:30:00Z is Sunday 2026-10-04 23:30 in America/Sao_Paulo (UTC-3):
    // same calendar week (Sun-Sat wraps Mon-Sun; here week is Sep28-Oct4) as the
    // requested Wednesday 2026-09-30, but a different week by the UTC date (Oct 5).
    appointments.findClientAppointmentDates.mockResolvedValue([
      { appointmentId: 'A1', startsAt: new Date('2026-10-05T02:30:00Z') },
    ]);

    const result = await useCase.execute({
      date: '2026-09-30',
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
      suggestSameWeekForClientId: 'CLIENT-1',
    });

    expect(result.sameWeekSuggestion?.date).toBe('2026-10-04');
  });
});

describe('CreateAppointmentUseCase', () => {
  function setup() {
    const appointments = {
      findBusyIntervals: vi
        .fn<AppointmentRepository['findBusyIntervals']>()
        .mockResolvedValue([]),
      create: vi
        .fn<AppointmentRepository['create']>()
        .mockImplementation(async (appointment, items) => ({
          appointment,
          items,
          status: AppointmentStatus.PENDING,
          totalCents: items.reduce((sum, item) => sum + item.priceCents, 0),
        })),
    };
    const professionals = {
      findWorkingHoursByIds: vi
        .fn<ProfessionalReader['findWorkingHoursByIds']>()
        .mockResolvedValue([{ professionalId: 'P1', weekday: 4, startTime: '09:00', endTime: '18:00' }]),
    };
    const resolveItems = {
      execute: vi
        .fn<ResolveAppointmentItemsUseCase['execute']>()
        .mockResolvedValue([
          { serviceId: 'S1', professionalId: 'P1', durationMinutes: 60, priceCents: 5000 },
        ]),
    };
    const clock = { now: vi.fn<Clock['now']>().mockReturnValue(new Date('2026-09-01T12:00:00Z')) };
    const useCase = new CreateAppointmentUseCase(
      appointments as unknown as AppointmentRepository,
      professionals as unknown as ProfessionalReader,
      resolveItems as unknown as ResolveAppointmentItemsUseCase,
      clock as unknown as Clock,
      SETTINGS,
    );
    return { appointments, professionals, resolveItems, clock, useCase };
  }

  it('creates the appointment with the priced item chained from the chosen start', async () => {
    const { appointments, useCase } = setup();

    const aggregate = await useCase.execute({
      clientId: 'CLIENT-1',
      startsAt: new Date('2026-10-01T15:00:00Z'), // 2026-10-01 (Thu) 12:00 in America/Sao_Paulo
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    expect(aggregate.appointment.clientId).toBe('CLIENT-1');
    expect(aggregate.items).toEqual([
      expect.objectContaining({
        serviceId: 'S1',
        professionalId: 'P1',
        priceCents: 5000,
        startsAt: new Date('2026-10-01T15:00:00Z'),
        endsAt: new Date('2026-10-01T16:00:00Z'),
      }),
    ]);
    expect(appointments.create).toHaveBeenCalledExactlyOnceWith(
      aggregate.appointment,
      aggregate.items,
      { eventType: 'APPOINTMENT_CREATED', payload: { appointmentId: aggregate.appointment.id } },
    );
  });

  it('rejects a start outside the professional working hours, without persisting anything', async () => {
    const { appointments, useCase } = setup();

    const attempt = useCase.execute({
      clientId: 'CLIENT-1',
      startsAt: new Date('2026-10-01T11:00:00Z'), // 08:00 local, before the 09:00 window
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    await expect(attempt).rejects.toMatchObject({
      response: { code: 'OUTSIDE_WORKING_HOURS' },
    });
    expect(appointments.create).not.toHaveBeenCalled();
  });

  it('rejects a start with less than the minimum lead time', async () => {
    const { clock, appointments, useCase } = setup();
    clock.now.mockReturnValue(new Date('2026-10-01T14:30:00Z')); // 30 min before the chosen start

    const attempt = useCase.execute({
      clientId: 'CLIENT-1',
      startsAt: new Date('2026-10-01T15:00:00Z'),
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    await expect(attempt).rejects.toMatchObject({
      response: { code: 'LEAD_TIME_TOO_SHORT' },
    });
    expect(appointments.create).not.toHaveBeenCalled();
  });

  it('rejects a date beyond the maximum days ahead', async () => {
    const { appointments, useCase } = setup();

    const attempt = useCase.execute({
      clientId: 'CLIENT-1',
      startsAt: new Date('2026-12-31T15:00:00Z'),
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    await expect(attempt).rejects.toMatchObject({
      response: { code: 'DATE_OUT_OF_RANGE' },
    });
    expect(appointments.create).not.toHaveBeenCalled();
  });

  it('rejects a start that does not fall on the 30-minute grid', async () => {
    const { appointments, useCase } = setup();

    const attempt = useCase.execute({
      clientId: 'CLIENT-1',
      startsAt: new Date('2026-10-01T15:07:00Z'),
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    await expect(attempt).rejects.toMatchObject({
      response: { code: 'INVALID_GRID_START' },
    });
    expect(appointments.create).not.toHaveBeenCalled();
  });

  it('rejects a slot already busy for the professional', async () => {
    const { appointments, useCase } = setup();
    appointments.findBusyIntervals.mockResolvedValue([
      {
        itemId: 'OTHER-ITEM',
        appointmentId: 'OTHER-APPOINTMENT',
        professionalId: 'P1',
        startsAt: new Date('2026-10-01T15:30:00Z'),
        endsAt: new Date('2026-10-01T16:00:00Z'),
      },
    ]);

    const attempt = useCase.execute({
      clientId: 'CLIENT-1',
      startsAt: new Date('2026-10-01T15:00:00Z'),
      items: [{ serviceId: 'S1', professionalId: 'P1' }],
    });

    await expect(attempt).rejects.toBeInstanceOf(SlotTakenException);
    expect(appointments.create).not.toHaveBeenCalled();
  });
});
