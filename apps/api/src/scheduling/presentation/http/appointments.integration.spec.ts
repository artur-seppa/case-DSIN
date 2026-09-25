import { Role } from '../../../shared/auth/role.js';
import { zonedPartsOf, zonedTimeToInstant } from '../../../shared/time/utc-offset.js';
import { createProfessional } from '../../../testing/factories/professional.factory.js';
import { createService } from '../../../testing/factories/service.factory.js';
import { createUser } from '../../../testing/factories/user.factory.js';
import { createWorkingHours } from '../../../testing/factories/working-hours.factory.js';
import {
  createTestApp,
  type TestApp,
} from '../../../testing/integration/test-app.js';
import type { TestClient } from '../../../testing/integration/test-client.js';
import { ProfessionalService } from '../../../professionals/domain/professional-service.entity.js';

const UTC_OFFSET_MINUTES = -3 * 60;

function futureLocalSlot(daysAhead: number, hour: number, minute = 0) {
  const base = zonedPartsOf(new Date(Date.now() + daysAhead * 86_400_000), UTC_OFFSET_MINUTES);
  const startsAt = zonedTimeToInstant({ ...base, hour, minute }, UTC_OFFSET_MINUTES);
  return { startsAt, weekday: base.weekday };
}

function nextGridSlot(): Date {
  const parts = zonedPartsOf(new Date(), UTC_OFFSET_MINUTES);
  const roundedUp = parts.minute < 30 ? 30 : 0;
  const hour = parts.minute < 30 ? parts.hour : parts.hour + 1;
  if (hour >= 23) {
    // The 60-minute service used in this suite would spill past the 23:30
    // working-hours close; roll to next-day opening instead (still under the
    // 2h lead time being tested here).
    return zonedTimeToInstant({ ...parts, day: parts.day + 1, hour: 0, minute: 0 }, UTC_OFFSET_MINUTES);
  }
  return zonedTimeToInstant({ ...parts, hour, minute: roundedUp }, UTC_OFFSET_MINUTES);
}

describe('Appointments', () => {
  let testApp: TestApp;
  let admin: TestClient;
  let client: TestClient;
  let clientUserId: string;
  let professionalId: string;
  let serviceId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await testApp.reset();
    const manager = testApp.dataSource.manager;

    const adminUser = await createUser(manager, { role: Role.ADMIN });
    const regularUser = await createUser(manager);
    clientUserId = regularUser.id;
    admin = await testApp.client().loginAs(adminUser);
    client = await testApp.client().loginAs(regularUser);

    const professional = await createProfessional(manager);
    const service = await createService(manager, { durationMinutes: 60 });
    professionalId = professional.id;
    serviceId = service.id;
    await manager.save(
      manager.create(ProfessionalService, { professionalId, serviceId }),
    );

    // Wide-open working hours for every weekday, so any future slot is bookable
    // regardless of what day the test suite happens to run on.
    for (let weekday = 1; weekday <= 7; weekday++) {
      await createWorkingHours(manager, {
        professionalId,
        weekday,
        startTime: '00:00:00',
        endTime: '23:30:00',
      });
    }
  });

  afterAll(() => testApp.close());

  describe('creation', () => {
    it('creates an appointment with a snapshot price and PENDING items', async () => {
      const { startsAt } = futureLocalSlot(3, 10);

      const response = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        status: 'PENDING',
        client: { id: clientUserId },
        items: [
          {
            status: 'PENDING',
            service: { id: serviceId },
            professional: { id: professionalId },
          },
        ],
      });
      expect(response.body.canClientChange).toBe(true);
    });

    it('answers 409 when the exact slot was just taken by someone else', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const first = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      expect(first.status).toBe(201);

      const conflicting = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      expect(conflicting.status).toBe(409);
      expect(conflicting.body.code).toBe('SLOT_TAKEN');
    });

    it('answers 422 when the lead time is under 2 hours', async () => {
      const startsAt = nextGridSlot();

      const response = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('LEAD_TIME_TOO_SHORT');
    });

    it('answers 422 when the professional does not offer the service', async () => {
      const manager = testApp.dataSource.manager;
      const otherService = await createService(manager);
      const { startsAt } = futureLocalSlot(3, 10);

      const response = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId: otherService.id, professionalId }],
      });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('PROFESSIONAL_DOES_NOT_OFFER_SERVICE');
    });

    it('answers 400 for a start off the 30-minute grid', async () => {
      const { startsAt } = futureLocalSlot(3, 10, 7);

      const response = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('INVALID_GRID_START');
    });
  });

  describe('ownership and visibility', () => {
    it('hides another client appointment as not found', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const stranger = await testApp
        .client()
        .loginAs(await createUser(testApp.dataSource.manager));
      const response = await stranger.get(`/appointments/${created.body.id}`);

      expect(response.status).toBe(404);
    });

    it('lets the admin see any appointment', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await admin.get(`/appointments/${created.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.body.id);
    });
  });

  describe('lifecycle', () => {
    it('confirms every pending item when the admin confirms the appointment', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await admin.post(`/appointments/${created.body.id}/confirm`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
      expect(response.body.items[0].status).toBe('CONFIRMED');
    });

    it('lets the admin cancel regardless of the 48h window', async () => {
      const { startsAt } = futureLocalSlot(1, 10); // < 48h away

      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await admin.post(`/appointments/${created.body.id}/cancel`, {
        reason: 'Salão fechado',
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
    });

    it('refuses a client cancellation once inside the 48h window', async () => {
      const { startsAt } = futureLocalSlot(1, 10); // < 48h away

      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await client.post(`/appointments/${created.body.id}/cancel`);

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('CHANGE_WINDOW_EXPIRED');
    });

    it('adds an item and then reprositions it, reverting a confirmed item to pending for the client', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      await admin.post(`/appointments/${created.body.id}/confirm`);
      const itemId = created.body.items[0].id;

      const laterStart = new Date(startsAt.getTime() + 4 * 60 * 60_000);
      const repositioned = await client.patch(
        `/appointments/${created.body.id}/items/${itemId}`,
        { startsAt: laterStart.toISOString() },
      );

      expect(repositioned.status).toBe(200);
      expect(repositioned.body.items[0].status).toBe('PENDING');
      expect(new Date(repositioned.body.items[0].startsAt)).toEqual(laterStart);
    });

    it('answers 409 when repositioning an item onto a slot just taken by another appointment', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const moving = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      const itemId = moving.body.items[0].id;

      const targetStart = new Date(startsAt.getTime() + 4 * 60 * 60_000);
      const other = await testApp
        .client()
        .loginAs(await createUser(testApp.dataSource.manager));
      await other.post('/appointments', {
        startsAt: targetStart.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await client.patch(
        `/appointments/${moving.body.id}/items/${itemId}`,
        { startsAt: targetStart.toISOString() },
      );

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('SLOT_TAKEN');
    });

    it('cancels a single item, leaving the appointment record intact', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      const itemId = created.body.items[0].id;

      const response = await client.post(
        `/appointments/${created.body.id}/items/${itemId}/cancel`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.items[0].status).toBe('CANCELLED');
    });

    it('refuses to start an item before the day of the appointment', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      await admin.post(`/appointments/${created.body.id}/confirm`);
      const itemId = created.body.items[0].id;

      const response = await admin.post(
        `/appointments/${created.body.id}/items/${itemId}/in-progress`,
      );

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('rejects an unknown :status value with 400', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      const itemId = created.body.items[0].id;

      const response = await admin.post(
        `/appointments/${created.body.id}/items/${itemId}/bogus`,
      );

      expect(response.status).toBe(400);
    });

    it('records history entries visible only to the admin', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      const created = await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      await admin.post(`/appointments/${created.body.id}/confirm`);

      const forbidden = await client.get(`/appointments/${created.body.id}/history`);
      expect(forbidden.status).toBe(403);

      const history = await admin.get(`/appointments/${created.body.id}/history`);
      expect(history.status).toBe(200);
      expect(history.body.length).toBeGreaterThan(0);
      expect(history.body[0]).toMatchObject({ action: 'ITEM_STATUS_CHANGED' });
    });
  });

  describe('listing', () => {
    it('only shows the client their own appointments', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const stranger = await testApp
        .client()
        .loginAs(await createUser(testApp.dataSource.manager));
      const { startsAt: otherStart } = futureLocalSlot(4, 10);
      await stranger.post('/appointments', {
        startsAt: otherStart.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await client.get('/appointments');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it('lets the admin filter by professional', async () => {
      const { startsAt } = futureLocalSlot(3, 10);
      await client.post('/appointments', {
        startsAt: startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await admin.get(`/appointments?professionalId=${professionalId}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
    });

    it('sorts by startsAt ascending, the query the web client sends for its "upcoming" tab', async () => {
      const soon = futureLocalSlot(3, 10);
      await client.post('/appointments', {
        startsAt: soon.startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });
      const later = futureLocalSlot(5, 10);
      await client.post('/appointments', {
        startsAt: later.startsAt.toISOString(),
        items: [{ serviceId, professionalId }],
      });

      const response = await client.get(
        '/appointments?page=1&limit=10&itemStatus=PENDING&itemStatus=CONFIRMED&itemStatus=IN_PROGRESS&sort=startsAt&order=asc',
      );

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(new Date(response.body.items[0].startsAt).getTime()).toBeLessThan(
        new Date(response.body.items[1].startsAt).getTime(),
      );
    });
  });

  describe('availability and config', () => {
    it('lists available starts for the requested items', async () => {
      const response = await client.get(
        `/availability?date=${dateKeyOf(3)}&items=${serviceId}:${professionalId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.starts.length).toBeGreaterThan(0);
    });

    it('exposes the business configuration', async () => {
      const response = await client.get('/config');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        utcOffsetMinutes: -180,
        slotMinutes: 30,
        minLeadHours: 2,
        maxDaysAhead: 60,
        changeWindowHours: 48,
      });
    });
  });
});

function dateKeyOf(daysAhead: number): string {
  const parts = zonedPartsOf(new Date(Date.now() + daysAhead * 86_400_000), UTC_OFFSET_MINUTES);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
