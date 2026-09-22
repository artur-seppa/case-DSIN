import {
  createService,
  makeService,
} from '../../../testing/factories/service.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { ServiceNameAlreadyInUseException } from '../../domain/exceptions.js';
import { Service } from '../../domain/service.entity.js';
import { TypeOrmServiceRepository } from './typeorm-service.repository.js';

const ALL = { page: 1, limit: 100 };

describe('TypeOrmServiceRepository', () => {
  const db = useTestDatabase();
  let repository: TypeOrmServiceRepository;

  beforeEach(() => {
    repository = new TypeOrmServiceRepository(
      db.dataSource.getRepository(Service),
    );
  });

  it('persists and finds a service by id', async () => {
    const service = makeService();

    await repository.insert(service);

    expect(await repository.findById(service.id)).toMatchObject({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      active: true,
    });
  });

  it('lists only active services by default, ordered by name', async () => {
    await createService(db.dataSource.manager, { name: 'Escova' });
    await createService(db.dataSource.manager, { name: 'Corte' });
    await createService(db.dataSource.manager, {
      name: 'Hidratação',
      active: false,
    });

    const active = await repository.list({ includeInactive: false }, ALL);
    const all = await repository.list({ includeInactive: true }, ALL);

    expect(active.items.map((service) => service.name)).toEqual([
      'Corte',
      'Escova',
    ]);
    expect(active.total).toBe(2);
    expect(all.items.map((service) => service.name)).toEqual([
      'Corte',
      'Escova',
      'Hidratação',
    ]);
    expect(all.total).toBe(3);
  });

  it('paginates the list and reports the total regardless of the page', async () => {
    for (const name of ['A', 'B', 'C', 'D', 'E']) {
      await createService(db.dataSource.manager, { name });
    }

    const first = await repository.list(
      { includeInactive: false },
      { page: 1, limit: 2 },
    );
    const last = await repository.list(
      { includeInactive: false },
      { page: 3, limit: 2 },
    );
    const beyond = await repository.list(
      { includeInactive: false },
      { page: 4, limit: 2 },
    );

    expect(first.items.map((s) => s.name)).toEqual(['A', 'B']);
    expect(last.items.map((s) => s.name)).toEqual(['E']);
    expect(beyond.items).toEqual([]);
    expect([first.total, last.total, beyond.total]).toEqual([5, 5, 5]);
  });

  it('finds several services by id and ignores unknown ids', async () => {
    const first = await createService(db.dataSource.manager);
    const second = await createService(db.dataSource.manager);
    await createService(db.dataSource.manager);

    const found = await repository.findByIds([
      first.id,
      second.id,
      makeService().id,
    ]);

    expect(found.map((service) => service.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    expect(await repository.findByIds([])).toEqual([]);
  });

  it('updates the given fields and returns the updated service', async () => {
    const service = await createService(db.dataSource.manager, {
      name: 'Corte',
      priceCents: 8000,
    });

    const updated = await repository.update(service.id, {
      name: 'Coloração',
      durationMinutes: 120,
      priceCents: 25000,
      active: false,
    });

    expect(updated).toMatchObject({
      id: service.id,
      name: 'Coloração',
      durationMinutes: 120,
      priceCents: 25000,
      active: false,
    });
  });

  it('changes only the fields that were informed', async () => {
    const service = await createService(db.dataSource.manager, {
      name: 'Corte',
      priceCents: 8000,
    });

    const updated = await repository.update(service.id, { priceCents: 9000 });

    expect(updated).toMatchObject({ name: 'Corte', priceCents: 9000 });
  });

  it('rejects a duplicated name, even with different casing', async () => {
    await createService(db.dataSource.manager, { name: 'Corte' });

    await expect(
      repository.insert(makeService({ name: 'CORTE' })),
    ).rejects.toBeInstanceOf(ServiceNameAlreadyInUseException);
  });

  it('rejects renaming a service to a name already in use', async () => {
    await createService(db.dataSource.manager, { name: 'Corte' });
    const other = await createService(db.dataSource.manager, {
      name: 'Escova',
    });

    await expect(
      repository.update(other.id, { name: 'corte' }),
    ).rejects.toBeInstanceOf(ServiceNameAlreadyInUseException);
  });

  it('returns null when the service does not exist', async () => {
    await expect(
      repository.update(makeService().id, { name: 'X' }),
    ).resolves.toBeNull();
  });

  it('rejects a duration that is not a multiple of 15 minutes', async () => {
    await expect(
      repository.insert(makeService({ durationMinutes: 40 })),
    ).rejects.toThrow(/ck_services_duration/);
  });

  it('rejects a negative price', async () => {
    await expect(
      repository.insert(makeService({ priceCents: -1 })),
    ).rejects.toThrow(/ck_services_price/);
  });
});
