import { createAppointment } from '../../../testing/factories/appointment.factory.js';
import { createAppointmentItem } from '../../../testing/factories/appointment-item.factory.js';
import { createService } from '../../../testing/factories/service.factory.js';
import { createProfessional } from '../../../testing/factories/professional.factory.js';
import { createUser } from '../../../testing/factories/user.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { Appointment } from '../../../scheduling/domain/entities/appointment.entity.js';
import { AppointmentItem } from '../../../scheduling/domain/entities/appointment-item.entity.js';
import { ItemStatus } from '../../../scheduling/domain/rules/item-status.js';
import { AppointmentMetricsReaderAdapter } from './appointment-metrics-reader.adapter.js';

const SETTINGS = { utcOffsetMinutes: -180 } as never;
const PREVIOUS_WEEK_START = new Date('2026-09-21T03:00:00Z');
const CURRENT_WEEK_START = new Date('2026-09-28T03:00:00Z');
const CURRENT_WEEK_END = new Date('2026-10-05T03:00:00Z');

describe('AppointmentMetricsReaderAdapter', () => {
  const db = useTestDatabase();
  let adapter: AppointmentMetricsReaderAdapter;
  let clientId: string;
  let serviceId: string;
  let professionalId: string;

  beforeEach(async () => {
    adapter = new AppointmentMetricsReaderAdapter(
      db.dataSource.getRepository(AppointmentItem),
      db.dataSource.getRepository(Appointment),
      SETTINGS,
    );
    clientId = (await createUser(db.dataSource.manager)).id;
    serviceId = (await createService(db.dataSource.manager)).id;
    professionalId = (await createProfessional(db.dataSource.manager)).id;
  });

  async function item(startsAt: string, status: ItemStatus, priceCents = 5000) {
    const appointment = await createAppointment(db.dataSource.manager, { clientId });
    await createAppointmentItem(db.dataSource.manager, {
      appointmentId: appointment.id,
      serviceId,
      professionalId,
      status,
      startsAt: new Date(startsAt),
      endsAt: new Date(new Date(startsAt).getTime() + 30 * 60_000),
      priceCents,
    });
    return appointment;
  }

  describe('weekComparisonCounts', () => {
    it('splits revenue, completed, cancelled and no-show counts by period in one pass', async () => {
      await item('2026-09-29T12:00:00Z', ItemStatus.COMPLETED, 5000);
      await item('2026-09-30T12:00:00Z', ItemStatus.CANCELLED);
      await item('2026-09-22T12:00:00Z', ItemStatus.COMPLETED, 3000);
      await item('2026-09-23T12:00:00Z', ItemStatus.NO_SHOW);

      const result = await adapter.weekComparisonCounts(PREVIOUS_WEEK_START, CURRENT_WEEK_START, CURRENT_WEEK_END);

      expect(result.current).toEqual({
        revenueCents: 5000,
        completedCount: 1,
        cancelledCount: 1,
        noShowCount: 0,
        totalItemsCount: 2,
      });
      expect(result.previous).toEqual({
        revenueCents: 3000,
        completedCount: 1,
        cancelledCount: 0,
        noShowCount: 1,
        totalItemsCount: 2,
      });
    });

    it('returns all-zero periods when there are no items at all', async () => {
      const result = await adapter.weekComparisonCounts(PREVIOUS_WEEK_START, CURRENT_WEEK_START, CURRENT_WEEK_END);

      expect(result.current).toEqual({
        revenueCents: 0,
        completedCount: 0,
        cancelledCount: 0,
        noShowCount: 0,
        totalItemsCount: 0,
      });
      expect(result.previous).toEqual({
        revenueCents: 0,
        completedCount: 0,
        cancelledCount: 0,
        noShowCount: 0,
        totalItemsCount: 0,
      });
    });
  });

  describe('appointmentsCreatedCounts', () => {
    it('counts appointments by createdAt, not by item startsAt', async () => {
      const inCurrentWeek = await item('2026-10-10T12:00:00Z', ItemStatus.PENDING);
      await db.dataSource.getRepository(Appointment).update(inCurrentWeek.id, {
        createdAt: new Date('2026-09-29T12:00:00Z'),
      });
      const inPreviousWeek = await item('2026-10-11T12:00:00Z', ItemStatus.PENDING);
      await db.dataSource.getRepository(Appointment).update(inPreviousWeek.id, {
        createdAt: new Date('2026-09-22T12:00:00Z'),
      });

      const result = await adapter.appointmentsCreatedCounts(PREVIOUS_WEEK_START, CURRENT_WEEK_START, CURRENT_WEEK_END);

      expect(result).toEqual({ current: 1, previous: 1 });
    });
  });

  describe('serviceRanking', () => {
    it('ranks completed items by service, limited and ordered by count desc', async () => {
      const other = await createService(db.dataSource.manager, { name: 'Manicure' });
      await item('2026-09-29T12:00:00Z', ItemStatus.COMPLETED);
      await item('2026-09-29T13:00:00Z', ItemStatus.COMPLETED);
      const appointment = await createAppointment(db.dataSource.manager, { clientId });
      await createAppointmentItem(db.dataSource.manager, {
        appointmentId: appointment.id,
        serviceId: other.id,
        professionalId,
        status: ItemStatus.COMPLETED,
        startsAt: new Date('2026-09-29T14:00:00Z'),
        endsAt: new Date('2026-09-29T14:30:00Z'),
      });

      const ranking = await adapter.serviceRanking(CURRENT_WEEK_START, CURRENT_WEEK_END, 10);

      expect(ranking[0]).toMatchObject({ serviceId, completedCount: 2 });
      expect(ranking[1]).toMatchObject({ serviceId: other.id, completedCount: 1 });
    });

    it('respects the limit', async () => {
      for (let i = 0; i < 3; i += 1) {
        const service = await createService(db.dataSource.manager, { name: `Serviço ${i}` });
        const appointment = await createAppointment(db.dataSource.manager, { clientId });
        const startsAt = new Date(new Date('2026-09-29T12:00:00Z').getTime() + i * 30 * 60_000);
        await createAppointmentItem(db.dataSource.manager, {
          appointmentId: appointment.id,
          serviceId: service.id,
          professionalId,
          status: ItemStatus.COMPLETED,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        });
      }

      const ranking = await adapter.serviceRanking(CURRENT_WEEK_START, CURRENT_WEEK_END, 2);

      expect(ranking).toHaveLength(2);
    });
  });

  describe('revenueByWeekday', () => {
    it('groups completed revenue by the salon-local weekday of startsAt', async () => {
      await item('2026-09-29T12:00:00Z', ItemStatus.COMPLETED, 4000);
      await item('2026-09-30T12:00:00Z', ItemStatus.COMPLETED, 1000);

      const rows = await adapter.revenueByWeekday(CURRENT_WEEK_START, CURRENT_WEEK_END);

      expect(rows).toContainEqual({ weekday: 2, revenueCents: 4000 });
      expect(rows).toContainEqual({ weekday: 3, revenueCents: 1000 });
    });
  });

  describe('scheduledMinutesByProfessional', () => {
    it('sums non-cancelled item durations per professional, excluding cancelled ones', async () => {
      await item('2026-09-29T12:00:00Z', ItemStatus.CONFIRMED);
      await item('2026-09-29T13:00:00Z', ItemStatus.CANCELLED);

      const rows = await adapter.scheduledMinutesByProfessional(CURRENT_WEEK_START, CURRENT_WEEK_END);

      expect(rows).toEqual([{ professionalId, scheduledMinutes: 30 }]);
    });
  });
});
