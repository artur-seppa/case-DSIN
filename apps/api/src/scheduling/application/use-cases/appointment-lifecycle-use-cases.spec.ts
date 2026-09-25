import { NotFoundException } from '@nestjs/common';
import { Role } from '../../../shared/auth/role.js';
import { Clock } from '../../../shared/time/clock.js';
import { Professional } from '../../../professionals/domain/professional.entity.js';
import { Service } from '../../../services/domain/service.entity.js';
import { User } from '../../../users/domain/user.entity.js';
import { makeAppointment } from '../../../testing/factories/appointment.factory.js';
import { makeAppointmentItem } from '../../../testing/factories/appointment-item.factory.js';
import { AppointmentHistoryAction } from '../../domain/entities/appointment-history-action.js';
import { AppointmentItem } from '../../domain/entities/appointment-item.entity.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import {
  AppointmentRepository,
  type AppointmentAggregate,
} from '../../domain/appointment.repository.js';
import {
  InvalidStatusTransitionException,
  SchedulingRuleViolationException,
} from '../../domain/exceptions.js';
import { AppointmentStatus } from '../../domain/appointment-status.js';
import { ItemStatus } from '../../domain/rules/item-status.js';
import { AppointmentDetailAssembler } from '../appointment-detail.assembler.js';
import { ItemPlacementResolver } from '../item-placement-resolver.js';
import { ProfessionalReader } from '../ports/professional-reader.js';
import { SchedulingSettings } from '../ports/scheduling-settings.js';
import { UserReader } from '../ports/user-reader.js';
import { AddItemUseCase } from './add-item.use-case.js';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case.js';
import { CancelItemUseCase } from './cancel-item.use-case.js';
import { ChangeItemStatusUseCase } from './change-item-status.use-case.js';
import { ConfirmAppointmentUseCase } from './confirm-appointment.use-case.js';
import { GetAppointmentHistoryUseCase } from './get-appointment-history.use-case.js';
import { GetAppointmentUseCase } from './get-appointment.use-case.js';
import { GetConfigUseCase } from './get-config.use-case.js';
import { ListAppointmentsUseCase } from './list-appointments.use-case.js';
import { RepositionItemUseCase } from './reposition-item.use-case.js';
import { ResolveAppointmentItemsUseCase } from './resolve-appointment-items.use-case.js';

const SETTINGS: SchedulingSettings = {
  utcOffsetMinutes: -180,
  slotMinutes: 30,
  minLeadMinutes: 120,
  maxDaysAhead: 60,
  changeWindowHours: 48,
};

const CLIENT_ID = 'CLIENT-1';
const CLIENT = { id: CLIENT_ID, role: Role.CLIENT };
const ADMIN = { id: 'ADMIN-1', role: Role.ADMIN };

const CLIENT_RELATION = Object.assign(new User(), {
  id: CLIENT_ID,
  name: 'Ana',
  email: 'ana@x.com',
  phone: null,
});
const SERVICE_RELATION = Object.assign(new Service(), {
  id: 'S1',
  name: 'Corte',
  durationMinutes: 60,
  priceCents: 5000,
  active: true,
});
const PROFESSIONAL_RELATION = Object.assign(new Professional(), {
  id: 'P1',
  name: 'Bia',
  active: true,
});

function withRelations(item: AppointmentItem): AppointmentItem {
  return Object.assign(item, { service: SERVICE_RELATION, professional: PROFESSIONAL_RELATION });
}

function aggregate(
  appointment: Appointment,
  items: AppointmentItem[],
  overrides: Partial<
    Pick<AppointmentAggregate, 'status' | 'totalCents' | 'startsAt' | 'endsAt' | 'activeStartsAt'>
  > = {},
): AppointmentAggregate {
  return {
    appointment,
    items,
    status: AppointmentStatus.PENDING,
    totalCents: 0,
    startsAt: new Date('2026-10-01T15:00:00Z'),
    endsAt: new Date('2026-10-01T16:00:00Z'),
    activeStartsAt: new Date('2026-10-01T15:00:00Z'),
    ...overrides,
  };
}

function makeAssembler() {
  const clock = { now: vi.fn<Clock['now']>().mockReturnValue(new Date('2026-09-01T12:00:00Z')) };
  const assembler = new AppointmentDetailAssembler(SETTINGS, clock as unknown as Clock);
  return { assembler, clock };
}

describe('AppointmentDetailAssembler', () => {
  it('exposes the status and total the repository derived, and the change window', () => {
    const { assembler } = makeAssembler();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const items = [
      withRelations(
        makeAppointmentItem({
          appointmentId: appointment.id,
          serviceId: 'S1',
          professionalId: 'P1',
          status: ItemStatus.CONFIRMED,
          startsAt: new Date('2026-10-01T15:00:00Z'),
          endsAt: new Date('2026-10-01T16:00:00Z'),
          priceCents: 5000,
        }),
      ),
      withRelations(
        makeAppointmentItem({
          appointmentId: appointment.id,
          serviceId: 'S1',
          professionalId: 'P1',
          status: ItemStatus.CANCELLED,
          startsAt: new Date('2026-10-01T16:00:00Z'),
          endsAt: new Date('2026-10-01T16:30:00Z'),
          priceCents: 3000,
        }),
      ),
    ];

    const detail = assembler.assemble(
      aggregate(appointment, items, { status: AppointmentStatus.CONFIRMED, totalCents: 5000 }),
    );

    expect(detail.status).toBe('CONFIRMED');
    expect(detail.totalCents).toBe(5000);
    expect(detail.changeDeadline).toEqual(new Date('2026-09-29T15:00:00Z'));
    expect(detail.canClientChange).toBe(true);
    expect(detail.items).toHaveLength(2);
    expect(detail.items[0]!.service).toEqual({ id: 'S1', name: 'Corte' });
    expect(detail.items[0]!.professional).toEqual({ id: 'P1', name: 'Bia' });
  });

  it('passes the repository-derived startsAt/endsAt through unchanged', () => {
    const { assembler } = makeAssembler();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const items = [
      withRelations(
        makeAppointmentItem({ appointmentId: appointment.id, serviceId: 'S1', professionalId: 'P1' }),
      ),
    ];

    const detail = assembler.assemble(
      aggregate(appointment, items, {
        startsAt: new Date('2026-10-01T15:00:00Z'),
        endsAt: new Date('2026-10-01T16:00:00Z'),
      }),
    );

    expect(detail.startsAt).toEqual(new Date('2026-10-01T15:00:00Z'));
    expect(detail.endsAt).toEqual(new Date('2026-10-01T16:00:00Z'));
  });

  it('has no change deadline once activeStartsAt is null (every item cancelled)', () => {
    const { assembler } = makeAssembler();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const items = [
      withRelations(
        makeAppointmentItem({
          appointmentId: appointment.id,
          serviceId: 'S1',
          professionalId: 'P1',
          status: ItemStatus.CANCELLED,
        }),
      ),
    ];

    const detail = assembler.assemble(
      aggregate(appointment, items, {
        status: AppointmentStatus.CANCELLED,
        totalCents: 0,
        activeStartsAt: null,
      }),
    );

    expect(detail.changeDeadline).toBeNull();
    expect(detail.canClientChange).toBe(false);
  });
});

describe('GetAppointmentUseCase', () => {
  it('returns the detail for the owner', async () => {
    const { assembler } = makeAssembler();
    const appointments = { findById: vi.fn<AppointmentRepository['findById']>() };
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const items = [
      withRelations(
        makeAppointmentItem({ appointmentId: appointment.id, serviceId: 'S1', professionalId: 'P1' }),
      ),
    ];
    appointments.findById.mockResolvedValue(aggregate(appointment, items));
    const useCase = new GetAppointmentUseCase(appointments as unknown as AppointmentRepository, assembler);

    const detail = await useCase.execute(appointment.id, CLIENT);

    expect(detail.id).toBe(appointment.id);
  });

  it('hides another client appointment as not found', async () => {
    const { assembler } = makeAssembler();
    const appointments = { findById: vi.fn<AppointmentRepository['findById']>() };
    const appointment = makeAppointment({ clientId: 'SOMEONE-ELSE' });
    appointments.findById.mockResolvedValue(
      aggregate(appointment, [makeAppointmentItem({ appointmentId: appointment.id })]),
    );
    const useCase = new GetAppointmentUseCase(appointments as unknown as AppointmentRepository, assembler);

    await expect(useCase.execute(appointment.id, CLIENT)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets the admin see any appointment', async () => {
    const { assembler } = makeAssembler();
    const appointments = { findById: vi.fn<AppointmentRepository['findById']>() };
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    appointments.findById.mockResolvedValue(
      aggregate(appointment, [
        withRelations(
          makeAppointmentItem({ appointmentId: appointment.id, serviceId: 'S1', professionalId: 'P1' }),
        ),
      ]),
    );
    const useCase = new GetAppointmentUseCase(appointments as unknown as AppointmentRepository, assembler);

    await expect(useCase.execute(appointment.id, ADMIN)).resolves.toBeDefined();
  });
});

describe('ListAppointmentsUseCase', () => {
  function setup() {
    const { assembler } = makeAssembler();
    const appointments = {
      list: vi.fn<AppointmentRepository['list']>().mockResolvedValue({ items: [], total: 0 }),
    };
    const users = { searchClientIds: vi.fn<UserReader['searchClientIds']>() };
    const useCase = new ListAppointmentsUseCase(
      appointments as unknown as AppointmentRepository,
      users as unknown as UserReader,
      assembler,
      SETTINGS,
    );
    return { appointments, users, useCase };
  }

  it('forces the client filter to the actor, ignoring any requested clientId', async () => {
    const { appointments, useCase } = setup();

    await useCase.execute({ clientId: 'SOMEONE-ELSE' }, { page: 1, limit: 20 }, CLIENT);

    const [filter] = appointments.list.mock.calls[0]!;
    expect(filter.clientId).toBe(CLIENT_ID);
  });

  it('resolves q into client ids for the admin', async () => {
    const { appointments, users, useCase } = setup();
    users.searchClientIds.mockResolvedValue(['C1', 'C2']);

    await useCase.execute({ q: 'ana' }, { page: 1, limit: 20 }, ADMIN);

    const [filter] = appointments.list.mock.calls[0]!;
    expect(filter.clientIds).toEqual(['C1', 'C2']);
  });

  it('short-circuits to an empty page when the admin search matches no client', async () => {
    const { appointments, users, useCase } = setup();
    users.searchClientIds.mockResolvedValue([]);

    const page = await useCase.execute({ q: 'ghost' }, { page: 1, limit: 20 }, ADMIN);

    expect(page).toEqual({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    expect(appointments.list).not.toHaveBeenCalled();
  });
});

describe('ConfirmAppointmentUseCase', () => {
  function setup() {
    const { assembler } = makeAssembler();
    const appointments = {
      findById: vi.fn<AppointmentRepository['findById']>(),
      updateItems: vi.fn<AppointmentRepository['updateItems']>(),
    };
    const useCase = new ConfirmAppointmentUseCase(
      appointments as unknown as AppointmentRepository,
      assembler,
    );
    return { appointments, useCase };
  }

  it('confirms every pending item in one call', async () => {
    const { appointments, useCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const pending = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.PENDING,
      }),
    );
    const alreadyConfirmed = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.CONFIRMED,
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [pending, alreadyConfirmed]));
    appointments.updateItems.mockResolvedValue(
      aggregate(appointment, [
        Object.assign(new AppointmentItem(), pending, { status: ItemStatus.CONFIRMED }),
        alreadyConfirmed,
      ]),
    );

    await useCase.execute(appointment.id, ADMIN.id);

    const [, updates] = appointments.updateItems.mock.calls[0]!;
    expect(updates).toEqual([{ itemId: pending.id, status: ItemStatus.CONFIRMED }]);
  });

  it('does nothing when there is no pending item', async () => {
    const { appointments, useCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const confirmed = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.CONFIRMED,
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [confirmed]));

    await useCase.execute(appointment.id, ADMIN.id);

    expect(appointments.updateItems).not.toHaveBeenCalled();
  });
});

describe('CancelAppointmentUseCase', () => {
  function setup() {
    const { assembler, clock } = makeAssembler();
    const appointments = {
      findById: vi.fn<AppointmentRepository['findById']>(),
      updateItems: vi.fn<AppointmentRepository['updateItems']>(),
    };
    const useCase = new CancelAppointmentUseCase(
      appointments as unknown as AppointmentRepository,
      clock as unknown as Clock,
      SETTINGS,
      assembler,
    );
    return { appointments, clock, useCase };
  }

  it('cancels every pending or confirmed item, leaving terminal items untouched', async () => {
    const { appointments, useCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const pending = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.PENDING,
        startsAt: new Date('2026-12-01T15:00:00Z'),
        endsAt: new Date('2026-12-01T16:00:00Z'),
      }),
    );
    const completed = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.COMPLETED,
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [pending, completed]));
    appointments.updateItems.mockResolvedValue(aggregate(appointment, [pending, completed]));

    await useCase.execute({ appointmentId: appointment.id, actor: ADMIN });

    const [, updates] = appointments.updateItems.mock.calls[0]!;
    expect(updates).toEqual([{ itemId: pending.id, status: ItemStatus.CANCELLED }]);
  });

  it('refuses a client cancellation outside the 48h window', async () => {
    const { appointments, useCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({
      appointmentId: appointment.id,
      status: ItemStatus.CONFIRMED,
      startsAt: new Date('2026-09-02T12:00:00Z'), // < 48h from clock.now()
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      useCase.execute({ appointmentId: appointment.id, actor: CLIENT }),
    ).rejects.toBeInstanceOf(SchedulingRuleViolationException);
    expect(appointments.updateItems).not.toHaveBeenCalled();
  });
});

describe('CancelItemUseCase', () => {
  function setup() {
    const { assembler, clock } = makeAssembler();
    const appointments = {
      findById: vi.fn<AppointmentRepository['findById']>(),
      updateItems: vi.fn<AppointmentRepository['updateItems']>(),
    };
    const useCase = new CancelItemUseCase(
      appointments as unknown as AppointmentRepository,
      clock as unknown as Clock,
      SETTINGS,
      assembler,
    );
    return { appointments, useCase };
  }

  it('refuses to cancel an item that already finished', async () => {
    const { appointments, useCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({ appointmentId: appointment.id, status: ItemStatus.COMPLETED });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      useCase.execute({ appointmentId: appointment.id, itemId: item.id, actor: ADMIN }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
    expect(appointments.updateItems).not.toHaveBeenCalled();
  });
});

describe('ChangeItemStatusUseCase', () => {
  function setup(now: Date) {
    const { assembler } = makeAssembler();
    const appointments = {
      findById: vi.fn<AppointmentRepository['findById']>(),
      updateItems: vi.fn<AppointmentRepository['updateItems']>(),
    };
    const clock = { now: vi.fn<Clock['now']>().mockReturnValue(now) };
    const useCase = new ChangeItemStatusUseCase(
      appointments as unknown as AppointmentRepository,
      clock as unknown as Clock,
      SETTINGS,
      assembler,
    );
    return { appointments, useCase };
  }

  it('refuses an invalid transition regardless of timing', async () => {
    const { appointments, useCase } = setup(new Date('2026-10-01T12:00:00Z'));
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({ appointmentId: appointment.id, status: ItemStatus.PENDING });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      useCase.execute({
        appointmentId: appointment.id,
        itemId: item.id,
        actorId: ADMIN.id,
        targetStatus: ItemStatus.IN_PROGRESS,
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
  });

  it('refuses to start the item before the day of the appointment', async () => {
    const { appointments, useCase } = setup(new Date('2026-09-30T23:59:00Z')); // 2026-09-30 20:59 in Sao Paulo
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({
      appointmentId: appointment.id,
      status: ItemStatus.CONFIRMED,
      startsAt: new Date('2026-10-01T15:00:00Z'), // 2026-10-01 in Sao Paulo
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      useCase.execute({
        appointmentId: appointment.id,
        itemId: item.id,
        actorId: ADMIN.id,
        targetStatus: ItemStatus.IN_PROGRESS,
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
  });

  it('allows starting the item on the day of the appointment', async () => {
    const { appointments, useCase } = setup(new Date('2026-10-01T13:00:00Z')); // 10:00 in Sao Paulo, same day
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const item = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.CONFIRMED,
        startsAt: new Date('2026-10-01T15:00:00Z'),
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));
    appointments.updateItems.mockResolvedValue(
      aggregate(appointment, [
        Object.assign(new AppointmentItem(), item, { status: ItemStatus.IN_PROGRESS }),
      ]),
    );

    await useCase.execute({
      appointmentId: appointment.id,
      itemId: item.id,
      actorId: ADMIN.id,
      targetStatus: ItemStatus.IN_PROGRESS,
    });

    expect(appointments.updateItems).toHaveBeenCalledExactlyOnceWith(
      appointment.id,
      [{ itemId: item.id, status: ItemStatus.IN_PROGRESS }],
      expect.any(Array),
      undefined,
    );
  });

  it('refuses to mark a no-show before the item has started', async () => {
    const { appointments, useCase } = setup(new Date('2026-10-01T14:59:00Z'));
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({
      appointmentId: appointment.id,
      status: ItemStatus.CONFIRMED,
      startsAt: new Date('2026-10-01T15:00:00Z'),
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      useCase.execute({
        appointmentId: appointment.id,
        itemId: item.id,
        actorId: ADMIN.id,
        targetStatus: ItemStatus.NO_SHOW,
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
  });

  it('emits an outbox event only when confirming an item', async () => {
    const { appointments, useCase } = setup(new Date('2026-10-01T12:00:00Z'));
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const item = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.PENDING,
        startsAt: new Date('2026-10-01T15:00:00Z'),
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));
    appointments.updateItems.mockResolvedValue(
      aggregate(appointment, [
        Object.assign(new AppointmentItem(), item, { status: ItemStatus.CONFIRMED }),
      ]),
    );

    await useCase.execute({
      appointmentId: appointment.id,
      itemId: item.id,
      actorId: ADMIN.id,
      targetStatus: ItemStatus.CONFIRMED,
    });

    const [, , , options] = appointments.updateItems.mock.calls[0]!;
    expect(options?.outboxEvent?.eventType).toBe('ITEMS_CONFIRMED');
  });
});

describe('GetAppointmentHistoryUseCase', () => {
  it('names each entry actor, falling back when the user cannot be found', async () => {
    const appointments = {
      findById: vi.fn<AppointmentRepository['findById']>(),
      findHistory: vi.fn<AppointmentRepository['findHistory']>(),
    };
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    appointments.findById.mockResolvedValue(
      aggregate(appointment, [makeAppointmentItem({ appointmentId: appointment.id })]),
    );
    appointments.findHistory.mockResolvedValue([
      {
        id: 'H1',
        itemId: 'ITEM-1',
        actorId: 'KNOWN',
        action: AppointmentHistoryAction.ITEM_STATUS_CHANGED,
        changes: {},
        occurredAt: new Date('2026-09-01T00:00:00Z'),
      } as never,
      {
        id: 'H2',
        itemId: 'ITEM-1',
        actorId: 'GHOST',
        action: AppointmentHistoryAction.ITEM_STATUS_CHANGED,
        changes: {},
        occurredAt: new Date('2026-09-02T00:00:00Z'),
      } as never,
    ]);
    const users = {
      findClient: vi.fn<UserReader['findClient']>().mockImplementation(async (id) =>
        id === 'KNOWN' ? { id: 'KNOWN', name: 'Ana', email: 'a@x.com', phone: null } : null,
      ),
    };
    const useCase = new GetAppointmentHistoryUseCase(
      appointments as unknown as AppointmentRepository,
      users as unknown as UserReader,
    );

    const entries = await useCase.execute(appointment.id);

    expect(entries[0]!.actor).toEqual({ id: 'KNOWN', name: 'Ana' });
    expect(entries[1]!.actor).toEqual({ id: 'GHOST', name: 'Desconhecido' });
  });
});

describe('GetConfigUseCase', () => {
  it('exposes the business parameters in the units the frontend expects', () => {
    const useCase = new GetConfigUseCase(SETTINGS);

    expect(useCase.execute()).toEqual({
      utcOffsetMinutes: -180,
      slotMinutes: 30,
      minLeadHours: 2,
      maxDaysAhead: 60,
      changeWindowHours: 48,
    });
  });
});

describe('AddItemUseCase and RepositionItemUseCase', () => {
  function setup() {
    const { assembler } = makeAssembler();
    const appointments = {
      findById: vi.fn<AppointmentRepository['findById']>(),
      addItem: vi.fn<AppointmentRepository['addItem']>(),
      updateItems: vi.fn<AppointmentRepository['updateItems']>(),
      findBusyIntervals: vi
        .fn<AppointmentRepository['findBusyIntervals']>()
        .mockResolvedValue([]),
    };
    const professionals = {
      findWorkingHours: vi
        .fn<ProfessionalReader['findWorkingHours']>()
        .mockResolvedValue([{ weekday: 4, startTime: '09:00', endTime: '18:00' }]),
      offersService: vi.fn<ProfessionalReader['offersService']>().mockResolvedValue(true),
    };
    const clock = { now: vi.fn<Clock['now']>().mockReturnValue(new Date('2026-09-01T12:00:00Z')) };
    const placement = new ItemPlacementResolver(
      appointments as unknown as AppointmentRepository,
      professionals as unknown as ProfessionalReader,
      clock as unknown as Clock,
      SETTINGS,
    );
    const resolveItems = {
      execute: vi
        .fn<ResolveAppointmentItemsUseCase['execute']>()
        .mockResolvedValue([
          { serviceId: 'S1', professionalId: 'P1', durationMinutes: 60, priceCents: 5000 },
        ]),
    };
    const addItemUseCase = new AddItemUseCase(
      appointments as unknown as AppointmentRepository,
      resolveItems as unknown as ResolveAppointmentItemsUseCase,
      placement,
      assembler,
      clock as unknown as Clock,
      SETTINGS,
    );
    const repositionUseCase = new RepositionItemUseCase(
      appointments as unknown as AppointmentRepository,
      placement,
      professionals as unknown as ProfessionalReader,
      assembler,
      clock as unknown as Clock,
      SETTINGS,
    );
    return { appointments, professionals, addItemUseCase, repositionUseCase };
  }

  it('adds a new item at the chosen start', async () => {
    const { appointments, addItemUseCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    appointments.findById.mockResolvedValue(aggregate(appointment, []));
    appointments.addItem.mockImplementation(async (_id, item) =>
      aggregate(appointment, [withRelations(item)]),
    );

    await addItemUseCase.execute({
      appointmentId: appointment.id,
      actor: ADMIN,
      serviceId: 'S1',
      professionalId: 'P1',
      startsAt: new Date('2026-10-01T15:00:00Z'),
    });

    const [, item, , outboxEvent] = appointments.addItem.mock.calls[0]!;
    expect(item.startsAt).toEqual(new Date('2026-10-01T15:00:00Z'));
    expect(item.endsAt).toEqual(new Date('2026-10-01T16:00:00Z'));
    expect(outboxEvent).toEqual({
      eventType: 'ITEM_ADDED',
      payload: { appointmentId: appointment.id, itemId: item.id },
    });
  });

  it('refuses to add an item that overlaps one already in the appointment', async () => {
    const { appointments, addItemUseCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const existing = makeAppointmentItem({
      appointmentId: appointment.id,
      professionalId: 'OTHER-PROFESSIONAL',
      status: ItemStatus.CONFIRMED,
      startsAt: new Date('2026-10-01T15:15:00Z'),
      endsAt: new Date('2026-10-01T15:45:00Z'),
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [existing]));

    await expect(
      addItemUseCase.execute({
        appointmentId: appointment.id,
        actor: ADMIN,
        serviceId: 'S1',
        professionalId: 'P1',
        startsAt: new Date('2026-10-01T15:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(SchedulingRuleViolationException);
    expect(appointments.addItem).not.toHaveBeenCalled();
  });

  it('refuses a client addition outside the 48h change window', async () => {
    const { appointments, addItemUseCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const existing = makeAppointmentItem({
      appointmentId: appointment.id,
      status: ItemStatus.CONFIRMED,
      startsAt: new Date('2026-09-02T12:00:00Z'),
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [existing]));

    await expect(
      addItemUseCase.execute({
        appointmentId: appointment.id,
        actor: CLIENT,
        serviceId: 'S1',
        professionalId: 'P1',
        startsAt: new Date('2026-10-01T15:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(SchedulingRuleViolationException);
    expect(appointments.addItem).not.toHaveBeenCalled();
  });

  it('reverts a confirmed item to pending when the client repositions it', async () => {
    const { appointments, repositionUseCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const item = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.CONFIRMED,
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: new Date('2026-10-01T10:00:00Z'),
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));
    appointments.updateItems.mockResolvedValue(
      aggregate(appointment, [
        Object.assign(new AppointmentItem(), item, { status: ItemStatus.PENDING }),
      ]),
    );

    await repositionUseCase.execute({
      appointmentId: appointment.id,
      itemId: item.id,
      actor: CLIENT,
      startsAt: new Date('2026-10-01T15:00:00Z'),
    });

    const [, updates, , options] = appointments.updateItems.mock.calls[0]!;
    expect(updates[0]).toMatchObject({ status: ItemStatus.PENDING });
    expect(options?.outboxEvent).toEqual({
      eventType: 'ITEM_REPOSITIONED',
      payload: { appointmentId: appointment.id, itemId: item.id },
    });
  });

  it('keeps the status when the admin repositions a confirmed item', async () => {
    const { appointments, repositionUseCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID, client: CLIENT_RELATION });
    const item = withRelations(
      makeAppointmentItem({
        appointmentId: appointment.id,
        serviceId: 'S1',
        professionalId: 'P1',
        status: ItemStatus.CONFIRMED,
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: new Date('2026-10-01T10:00:00Z'),
      }),
    );
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));
    appointments.updateItems.mockResolvedValue(aggregate(appointment, [item]));

    await repositionUseCase.execute({
      appointmentId: appointment.id,
      itemId: item.id,
      actor: ADMIN,
      startsAt: new Date('2026-10-01T15:00:00Z'),
    });

    const [, updates] = appointments.updateItems.mock.calls[0]!;
    expect(updates[0]).not.toHaveProperty('status');
  });

  it('refuses to move an item to a professional who does not offer its service', async () => {
    const { appointments, professionals, repositionUseCase } = setup();
    professionals.offersService.mockResolvedValue(false);
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({
      appointmentId: appointment.id,
      serviceId: 'S1',
      professionalId: 'P1',
      status: ItemStatus.CONFIRMED,
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      repositionUseCase.execute({
        appointmentId: appointment.id,
        itemId: item.id,
        actor: ADMIN,
        startsAt: new Date('2026-10-01T15:00:00Z'),
        professionalId: 'P2',
      }),
    ).rejects.toBeInstanceOf(SchedulingRuleViolationException);
    expect(professionals.offersService).toHaveBeenCalledExactlyOnceWith('P2', 'S1');
    expect(appointments.updateItems).not.toHaveBeenCalled();
  });

  it('refuses to reposition an item that already started', async () => {
    const { appointments, repositionUseCase } = setup();
    const appointment = makeAppointment({ clientId: CLIENT_ID });
    const item = makeAppointmentItem({
      appointmentId: appointment.id,
      status: ItemStatus.IN_PROGRESS,
    });
    appointments.findById.mockResolvedValue(aggregate(appointment, [item]));

    await expect(
      repositionUseCase.execute({
        appointmentId: appointment.id,
        itemId: item.id,
        actor: ADMIN,
        startsAt: new Date('2026-10-01T15:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
  });
});
