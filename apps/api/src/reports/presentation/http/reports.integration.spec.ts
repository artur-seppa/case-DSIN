import { Role } from '../../../shared/auth/role.js';
import { createProfessional } from '../../../testing/factories/professional.factory.js';
import { createService } from '../../../testing/factories/service.factory.js';
import { createUser } from '../../../testing/factories/user.factory.js';
import { createTestApp, type TestApp } from '../../../testing/integration/test-app.js';
import type { TestClient } from '../../../testing/integration/test-client.js';

describe('Reports', () => {
  let testApp: TestApp;
  let admin: TestClient;
  let client: TestClient;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await testApp.reset();
    const manager = testApp.dataSource.manager;
    admin = await testApp.client().loginAs(await createUser(manager, { role: Role.ADMIN }));
    client = await testApp.client().loginAs(await createUser(manager));
  });

  it('rejects a CLIENT', async () => {
    const response = await client.get('/reports/weekly?weekStart=2026-09-28');

    expect(response.status).toBe(403);
  });

  it('returns the weekly report for an ADMIN, with all 7 revenueByWeekday entries', async () => {
    await createService(testApp.dataSource.manager);
    await createProfessional(testApp.dataSource.manager);

    const response = await admin.get('/reports/weekly?weekStart=2026-09-28');

    expect(response.status).toBe(200);
    expect(response.body.weekStart).toBe('2026-09-28');
    expect(response.body.weekEnd).toBe('2026-10-04');
    expect(response.body.revenueByWeekday).toHaveLength(7);
    expect(response.body).toHaveProperty('current.cancellationRate');
    expect(response.body).toHaveProperty('professionalOccupancy');
  });

  it('caches by weekStart: a second call with a different weekStart is not the cached first response', async () => {
    const first = await admin.get('/reports/weekly?weekStart=2026-09-28');
    const second = await admin.get('/reports/weekly?weekStart=2026-10-05');

    expect(first.body.weekStart).toBe('2026-09-28');
    expect(second.body.weekStart).toBe('2026-10-05');
  });
});
