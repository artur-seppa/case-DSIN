import { createAppointment } from '../../../testing/factories/appointment.factory.js';
import { createAppointmentItem } from '../../../testing/factories/appointment-item.factory.js';
import { createProfessional } from '../../../testing/factories/professional.factory.js';
import { createService } from '../../../testing/factories/service.factory.js';
import { createUser } from '../../../testing/factories/user.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { localDate, localDayBounds } from '../../../shared/time/utc-offset.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/appointment-status.js';
import { ItemStatus } from '../../domain/rules/item-status.js';
import { TypeOrmAppointmentRepository } from './typeorm-appointment.repository.js';

describe('TypeOrmAppointmentRepository', () => {
  const db = useTestDatabase();
  let repository: TypeOrmAppointmentRepository;
  let clientId: string;
  let serviceId: string;
  let professionalId: string;

  beforeEach(async () => {
    repository = new TypeOrmAppointmentRepository(db.dataSource.getRepository(Appointment));
    const client = await createUser(db.dataSource.manager);
    const service = await createService(db.dataSource.manager);
    const professional = await createProfessional(db.dataSource.manager);
    clientId = client.id;
    serviceId = service.id;
    professionalId = professional.id;
  });

  async function createItems(appointmentId: string, statuses: ItemStatus[]) {
    let hour = 9;
    for (const status of statuses) {
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId,
        serviceId,
        professionalId,
        status,
        startsAt: new Date(`2026-10-01T${String(hour).padStart(2, '0')}:00:00Z`),
        endsAt: new Date(`2026-10-01T${String(hour + 1).padStart(2, '0')}:00:00Z`),
        priceCents: 1000,
      });
      hour += 1;
    }
  }

  describe('derived status', () => {
    it.each([
      [[ItemStatus.CANCELLED], AppointmentStatus.CANCELLED],
      [[ItemStatus.CANCELLED, ItemStatus.CANCELLED], AppointmentStatus.CANCELLED],
      [[ItemStatus.PENDING], AppointmentStatus.PENDING],
      [[ItemStatus.CONFIRMED, ItemStatus.PENDING], AppointmentStatus.PENDING],
      [[ItemStatus.CONFIRMED], AppointmentStatus.CONFIRMED],
      [[ItemStatus.CONFIRMED, ItemStatus.CANCELLED], AppointmentStatus.CONFIRMED],
      [[ItemStatus.COMPLETED], AppointmentStatus.FINISHED],
      [[ItemStatus.COMPLETED, ItemStatus.NO_SHOW], AppointmentStatus.FINISHED],
      [[ItemStatus.COMPLETED, ItemStatus.CANCELLED], AppointmentStatus.FINISHED],
      [[ItemStatus.IN_PROGRESS], AppointmentStatus.IN_PROGRESS],
      [[ItemStatus.COMPLETED, ItemStatus.CONFIRMED], AppointmentStatus.IN_PROGRESS],
      [[ItemStatus.NO_SHOW, ItemStatus.CONFIRMED], AppointmentStatus.IN_PROGRESS],
    ] as const)('derives %j as %s', async (statuses, expected) => {
      const appointment = await createAppointment(db.dataSource.manager, { clientId });
      await createItems(appointment.id, [...statuses]);

      const aggregate = await repository.findById(appointment.id);

      expect(aggregate!.status).toBe(expected);
    });
  });

  describe('derived totalCents', () => {
    it('sums active items and excludes cancelled ones', async () => {
      const appointment = await createAppointment(db.dataSource.manager, { clientId });
      await db.dataSource.manager.transaction(async (manager) => {
        await createAppointmentItem(manager, {
          appointmentId: appointment.id,
          serviceId,
          professionalId,
          status: ItemStatus.CONFIRMED,
          startsAt: new Date('2026-10-01T09:00:00Z'),
          endsAt: new Date('2026-10-01T10:00:00Z'),
          priceCents: 5000,
        });
        await createAppointmentItem(manager, {
          appointmentId: appointment.id,
          serviceId,
          professionalId,
          status: ItemStatus.CANCELLED,
          startsAt: new Date('2026-10-01T10:00:00Z'),
          endsAt: new Date('2026-10-01T11:00:00Z'),
          priceCents: 3000,
        });
      });

      const aggregate = await repository.findById(appointment.id);

      expect(aggregate!.totalCents).toBe(5000);
    });
  });

  describe('derived startsAt/endsAt/activeStartsAt', () => {
    it('excludes cancelled items from the display range and from activeStartsAt', async () => {
      const appointment = await createAppointment(db.dataSource.manager, { clientId });
      await db.dataSource.manager.transaction(async (manager) => {
        await createAppointmentItem(manager, {
          appointmentId: appointment.id,
          serviceId,
          professionalId,
          status: ItemStatus.CANCELLED,
          startsAt: new Date('2026-10-01T09:00:00Z'),
          endsAt: new Date('2026-10-01T09:30:00Z'),
        });
        await createAppointmentItem(manager, {
          appointmentId: appointment.id,
          serviceId,
          professionalId,
          status: ItemStatus.CONFIRMED,
          startsAt: new Date('2026-10-01T15:00:00Z'),
          endsAt: new Date('2026-10-01T16:00:00Z'),
        });
      });

      const aggregate = await repository.findById(appointment.id);

      expect(aggregate!.startsAt).toEqual(new Date('2026-10-01T15:00:00Z'));
      expect(aggregate!.endsAt).toEqual(new Date('2026-10-01T16:00:00Z'));
      expect(aggregate!.activeStartsAt).toEqual(new Date('2026-10-01T15:00:00Z'));
    });

    it('falls back to the full item range and has no activeStartsAt when every item is cancelled', async () => {
      const appointment = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: appointment.id,
        serviceId,
        professionalId,
        status: ItemStatus.CANCELLED,
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: new Date('2026-10-01T09:30:00Z'),
      });

      const aggregate = await repository.findById(appointment.id);

      expect(aggregate!.startsAt).toEqual(new Date('2026-10-01T09:00:00Z'));
      expect(aggregate!.endsAt).toEqual(new Date('2026-10-01T09:30:00Z'));
      expect(aggregate!.activeStartsAt).toBeNull();
    });
  });

  describe('list filtering by date range', () => {
    it('bounds from/to by the salon-local calendar day, not raw UTC midnight', async () => {
      const UTC_OFFSET_MINUTES = -180;
      const previousLocalDay = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: previousLocalDay.id,
        serviceId,
        professionalId,
        startsAt: new Date('2026-09-30T23:00:00Z'), // 2026-09-30 20:00 local
        endsAt: new Date('2026-10-01T00:00:00Z'),
      });
      const withinLocalDay = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: withinLocalDay.id,
        serviceId,
        professionalId,
        startsAt: new Date('2026-10-01T23:00:00Z'), // 2026-10-01 20:00 local
        endsAt: new Date('2026-10-02T00:00:00Z'),
      });
      const nextLocalDay = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: nextLocalDay.id,
        serviceId,
        professionalId,
        startsAt: new Date('2026-10-02T04:00:00Z'), // 2026-10-02 01:00 local
        endsAt: new Date('2026-10-02T05:00:00Z'),
      });

      const bounds = localDayBounds(localDate('2026-10-01'), UTC_OFFSET_MINUTES);
      const { items, total } = await repository.list(
        { from: bounds.start, to: bounds.end },
        { page: 1, limit: 20 },
      );

      expect(total).toBe(1);
      expect(items[0]!.appointment.id).toBe(withinLocalDay.id);
    });
  });

  describe('list sorting by startsAt', () => {
    it('orders by the earliest active item start time, not appointment.createdAt', async () => {
      const soonest = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: soonest.id,
        serviceId,
        professionalId,
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: new Date('2026-10-01T10:00:00Z'),
      });
      const latest = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: latest.id,
        serviceId,
        professionalId,
        startsAt: new Date('2026-10-03T09:00:00Z'),
        endsAt: new Date('2026-10-03T10:00:00Z'),
      });
      const middle = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: middle.id,
        serviceId,
        professionalId,
        startsAt: new Date('2026-10-02T09:00:00Z'),
        endsAt: new Date('2026-10-02T10:00:00Z'),
      });

      const { items } = await repository.list(
        { sort: 'startsAt', order: 'asc' },
        { page: 1, limit: 20 },
      );

      expect(items.map((item) => item.appointment.id)).toEqual([soonest.id, middle.id, latest.id]);
    });

    it('ignores cancelled items when picking the sort time, unless every item is cancelled', async () => {
      const cancelledFirstThenActiveLater = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: cancelledFirstThenActiveLater.id,
        serviceId,
        professionalId,
        status: ItemStatus.CANCELLED,
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: new Date('2026-10-01T10:00:00Z'),
      });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: cancelledFirstThenActiveLater.id,
        serviceId,
        professionalId,
        status: ItemStatus.CONFIRMED,
        startsAt: new Date('2026-10-05T09:00:00Z'),
        endsAt: new Date('2026-10-05T10:00:00Z'),
      });
      const activeEarlier = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: activeEarlier.id,
        serviceId,
        professionalId,
        status: ItemStatus.CONFIRMED,
        startsAt: new Date('2026-10-02T09:00:00Z'),
        endsAt: new Date('2026-10-02T10:00:00Z'),
      });
      const fullyCancelled = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: fullyCancelled.id,
        serviceId,
        professionalId,
        status: ItemStatus.CANCELLED,
        startsAt: new Date('2026-10-03T09:00:00Z'),
        endsAt: new Date('2026-10-03T10:00:00Z'),
      });

      const { items } = await repository.list(
        { sort: 'startsAt', order: 'asc' },
        { page: 1, limit: 20 },
      );

      // activeEarlier's only active item starts 10/02; cancelledFirstThenActiveLater's
      // active item starts 10/05 (its cancelled 10/01 item is ignored); fullyCancelled
      // falls back to its single cancelled item's 10/03 start since none are active.
      expect(items.map((item) => item.appointment.id)).toEqual([
        activeEarlier.id,
        fullyCancelled.id,
        cancelledFirstThenActiveLater.id,
      ]);
    });
  });
});
