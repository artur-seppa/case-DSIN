import { Role } from '../../../shared/auth/role.js';
import { createProfessional } from '../../../testing/factories/professional.factory.js';
import { createService } from '../../../testing/factories/service.factory.js';
import { createUser } from '../../../testing/factories/user.factory.js';
import {
  createTestApp,
  type TestApp,
} from '../../../testing/integration/test-app.js';
import type { TestClient } from '../../../testing/integration/test-client.js';

describe('Catalog (services and professionals)', () => {
  let testApp: TestApp;
  let admin: TestClient;
  let clientUser: TestClient;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await testApp.reset();
    const adminUser = await createUser(testApp.dataSource.manager, {
      role: Role.ADMIN,
    });
    const regularUser = await createUser(testApp.dataSource.manager);
    admin = await testApp.client().loginAs(adminUser);
    clientUser = await testApp.client().loginAs(regularUser);
  });

  afterAll(() => testApp.close());

  describe('services', () => {
    it('lets an admin create and update a service', async () => {
      const created = await admin.post('/services', {
        name: 'Corte',
        durationMinutes: 60,
        priceCents: 8000,
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ name: 'Corte', active: true });

      const updated = await admin.patch(`/services/${created.body.id}`, {
        priceCents: 9000,
        active: false,
      });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ priceCents: 9000, active: false });
    });

    it.each([
      { name: null },
      { durationMinutes: null },
      { priceCents: null },
      { active: null },
    ])(
      'answers 400, not 500, when a service field is set to null (%o)',
      async (body) => {
        const service = await createService(testApp.dataSource.manager);

        const response = await admin.patch(`/services/${service.id}`, body);

        expect(response.status).toBe(400);
      },
    );

    it('trims the name when creating a service', async () => {
      const created = await admin.post('/services', {
        name: '  Corte  ',
        durationMinutes: 60,
        priceCents: 8000,
      });

      expect(created.body.name).toBe('Corte');
    });

    it('answers 404 when updating a service that does not exist', async () => {
      const ghost = await createService(testApp.dataSource.manager);
      await testApp.dataSource.manager.delete('services', { id: ghost.id });

      const response = await admin.patch(`/services/${ghost.id}`, {
        name: 'Qualquer',
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Serviço não encontrado');
    });

    it('forbids a client from creating a service', async () => {
      const response = await clientUser.post('/services', {
        name: 'Corte',
        durationMinutes: 60,
        priceCents: 8000,
      });

      expect(response.status).toBe(403);
    });

    it('rejects a duplicated service name, even with different casing', async () => {
      await createService(testApp.dataSource.manager, { name: 'Corte' });

      const response = await admin.post('/services', {
        name: 'CORTE',
        durationMinutes: 60,
        priceCents: 8000,
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('SERVICE_NAME_ALREADY_IN_USE');
    });

    it('rejects a duration that is not a multiple of 15 minutes', async () => {
      const response = await admin.post('/services', {
        name: 'Corte',
        durationMinutes: 40,
        priceCents: 8000,
      });

      expect(response.status).toBe(400);
    });

    it('shows inactive services only to admins', async () => {
      await createService(testApp.dataSource.manager, { name: 'Ativo' });
      await createService(testApp.dataSource.manager, {
        name: 'Inativo',
        active: false,
      });

      const asClient = await clientUser.get('/services?includeInactive=true');
      const asAdmin = await admin.get('/services?includeInactive=true');

      expect(asClient.body.items.map((s: { name: string }) => s.name)).toEqual([
        'Ativo',
      ]);
      expect(asAdmin.body.items.map((s: { name: string }) => s.name)).toEqual([
        'Ativo',
        'Inativo',
      ]);
    });

    it('paginates the list, with defaults when no page is asked', async () => {
      for (const name of ['A', 'B', 'C', 'D', 'E']) {
        await createService(testApp.dataSource.manager, { name });
      }

      const defaults = await clientUser.get('/services');
      const second = await clientUser.get('/services?page=2&limit=2');

      expect(defaults.body).toMatchObject({
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(defaults.body.items).toHaveLength(5);
      expect(second.body).toMatchObject({
        total: 5,
        page: 2,
        limit: 2,
        totalPages: 3,
      });
      expect(second.body.items.map((s: { name: string }) => s.name)).toEqual([
        'C',
        'D',
      ]);
      expect(second.body.items[0]).not.toHaveProperty('createdAt');
    });

    it.each([
      'page=0',
      'page=abc',
      'page=1e18',
      'limit=0',
      'limit=101',
      'limit=1.5',
    ])('rejects an invalid pagination (%s) in Portuguese', async (query) => {
      const response = await clientUser.get(`/services?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.message[0]).toMatch(/Página|Itens por página/);
    });

    it('requires authentication', async () => {
      expect((await testApp.client().get('/services')).status).toBe(401);
    });
  });

  describe('professionals', () => {
    it('builds a professional with services and weekly hours, then reads the detail', async () => {
      const corte = await createService(testApp.dataSource.manager);
      const escova = await createService(testApp.dataSource.manager);
      const created = await admin.post('/professionals', { name: 'Ana' });
      const id = created.body.id;

      const withServices = await admin.put(`/professionals/${id}/services`, {
        serviceIds: [corte.id, escova.id],
      });
      const withHours = await admin.put(`/professionals/${id}/working-hours`, {
        windows: [
          { weekday: 1, startTime: '09:00', endTime: '12:00' },
          { weekday: 1, startTime: '13:00', endTime: '18:00' },
        ],
      });

      expect(created.status).toBe(201);
      expect(withServices.status).toBe(200);
      expect(withHours.status).toBe(200);

      const detail = await clientUser.get(`/professionals/${id}`);
      expect(detail.body.serviceIds.sort()).toEqual(
        [corte.id, escova.id].sort(),
      );
      expect(detail.body.workingHours).toEqual([
        { weekday: 1, startTime: '09:00', endTime: '12:00' },
        { weekday: 1, startTime: '13:00', endTime: '18:00' },
      ]);
    });

    it('rejects overlapping working windows', async () => {
      const professional = await createProfessional(testApp.dataSource.manager);

      const response = await admin.put(
        `/professionals/${professional.id}/working-hours`,
        {
          windows: [
            { weekday: 2, startTime: '09:00', endTime: '13:00' },
            { weekday: 2, startTime: '12:00', endTime: '18:00' },
          ],
        },
      );

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('INVALID_WORKING_HOURS');
    });

    it('rejects linking a service that does not exist', async () => {
      const professional = await createProfessional(testApp.dataSource.manager);
      const ghost = await createService(testApp.dataSource.manager);
      await testApp.dataSource.manager.delete('services', { id: ghost.id });

      const response = await admin.put(
        `/professionals/${professional.id}/services`,
        { serviceIds: [ghost.id] },
      );

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('SERVICES_NOT_FOUND');
    });

    it('filters professionals by the service they perform', async () => {
      const corte = await createService(testApp.dataSource.manager);
      const ana = await createProfessional(testApp.dataSource.manager, {
        name: 'Ana',
      });
      await createProfessional(testApp.dataSource.manager, { name: 'Bia' });
      await admin.put(`/professionals/${ana.id}/services`, {
        serviceIds: [corte.id],
      });

      const response = await clientUser.get(
        `/professionals?serviceId=${corte.id}`,
      );

      expect(response.body.items.map((p: { name: string }) => p.name)).toEqual([
        'Ana',
      ]);
      expect(response.body).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    });

    it('paginates professionals', async () => {
      for (const name of ['Ana', 'Bia', 'Cris']) {
        await createProfessional(testApp.dataSource.manager, { name });
      }

      const response = await clientUser.get('/professionals?page=2&limit=2');

      expect(response.body.items.map((p: { name: string }) => p.name)).toEqual([
        'Cris',
      ]);
      expect(response.body).toMatchObject({ total: 3, page: 2, totalPages: 2 });
    });

    it('hides inactive professionals from clients', async () => {
      const inactive = await createProfessional(testApp.dataSource.manager, {
        active: false,
      });

      expect(
        (await clientUser.get(`/professionals/${inactive.id}`)).status,
      ).toBe(404);
      expect((await admin.get(`/professionals/${inactive.id}`)).status).toBe(
        200,
      );
    });

    it('forbids a client from changing professionals', async () => {
      const professional = await createProfessional(testApp.dataSource.manager);

      expect(
        (await clientUser.post('/professionals', { name: 'X Y' })).status,
      ).toBe(403);
      expect(
        (
          await clientUser.put(`/professionals/${professional.id}/services`, {
            serviceIds: [],
          })
        ).status,
      ).toBe(403);
    });
  });
});
