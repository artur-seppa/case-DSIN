import {
  createProfessional,
  makeProfessional,
} from '../../../testing/factories/professional.factory.js';
import { createService } from '../../../testing/factories/service.factory.js';
import {
  createWorkingHours,
  makeWorkingHours,
} from '../../../testing/factories/working-hours.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { Professional } from '../../domain/professional.entity.js';
import { TypeOrmProfessionalRepository } from './typeorm-professional.repository.js';

const ALL = { page: 1, limit: 100 };

describe('TypeOrmProfessionalRepository', () => {
  const db = useTestDatabase();
  let repository: TypeOrmProfessionalRepository;

  beforeEach(() => {
    repository = new TypeOrmProfessionalRepository(
      db.dataSource.getRepository(Professional),
    );
  });

  it('persists a professional', async () => {
    const professional = makeProfessional({ name: 'Ana' });

    await repository.insert(professional);

    expect(await repository.findById(professional.id)).toMatchObject({
      name: 'Ana',
      active: true,
    });
  });

  it('updates the given fields and returns the updated professional', async () => {
    const professional = await createProfessional(db.dataSource.manager, {
      name: 'Ana',
    });

    const updated = await repository.update(professional.id, {
      name: 'Ana Paula',
      active: false,
    });

    expect(updated).toMatchObject({ name: 'Ana Paula', active: false });
  });

  it('returns null when the professional does not exist', async () => {
    await expect(
      repository.update(makeProfessional().id, { name: 'X' }),
    ).resolves.toBeNull();
  });

  describe('list', () => {
    it('hides inactive professionals unless asked, ordered by name', async () => {
      await createProfessional(db.dataSource.manager, { name: 'Bia' });
      await createProfessional(db.dataSource.manager, { name: 'Ana' });
      await createProfessional(db.dataSource.manager, {
        name: 'Cris',
        active: false,
      });

      const active = await repository.list({ includeInactive: false }, ALL);
      const all = await repository.list({ includeInactive: true }, ALL);

      expect(active.items.map((p) => p.name)).toEqual(['Ana', 'Bia']);
      expect(all.items.map((p) => p.name)).toEqual(['Ana', 'Bia', 'Cris']);
      expect([active.total, all.total]).toEqual([2, 3]);
    });

    it('paginates the list and reports the total regardless of the page', async () => {
      for (const name of ['Ana', 'Bia', 'Cris', 'Dani', 'Eva']) {
        await createProfessional(db.dataSource.manager, { name });
      }

      const first = await repository.list(
        { includeInactive: false },
        { page: 1, limit: 2 },
      );
      const last = await repository.list(
        { includeInactive: false },
        { page: 3, limit: 2 },
      );

      expect(first.items.map((p) => p.name)).toEqual(['Ana', 'Bia']);
      expect(last.items.map((p) => p.name)).toEqual(['Eva']);
      expect([first.total, last.total]).toEqual([5, 5]);
    });

    it('filters by the service the professional performs', async () => {
      const corte = await createService(db.dataSource.manager);
      const escova = await createService(db.dataSource.manager);
      const ana = await createProfessional(db.dataSource.manager, {
        name: 'Ana',
      });
      const bia = await createProfessional(db.dataSource.manager, {
        name: 'Bia',
      });
      await repository.replaceServices(ana.id, [corte.id, escova.id]);
      await repository.replaceServices(bia.id, [escova.id]);

      const doCorte = await repository.list(
        { includeInactive: false, serviceId: corte.id },
        ALL,
      );
      const doEscova = await repository.list(
        { includeInactive: false, serviceId: escova.id },
        ALL,
      );

      expect(doCorte.items.map((p) => p.name)).toEqual(['Ana']);
      expect(doEscova.items.map((p) => p.name)).toEqual(['Ana', 'Bia']);
      expect([doCorte.total, doEscova.total]).toEqual([1, 2]);
    });

    it('counts each professional once when filtering by service and paginating', async () => {
      const escova = await createService(db.dataSource.manager);
      for (const name of ['Ana', 'Bia', 'Cris']) {
        const professional = await createProfessional(db.dataSource.manager, {
          name,
        });
        await repository.replaceServices(professional.id, [escova.id]);
      }

      const page = await repository.list(
        { includeInactive: false, serviceId: escova.id },
        { page: 2, limit: 2 },
      );

      expect(page.items.map((p) => p.name)).toEqual(['Cris']);
      expect(page.total).toBe(3);
    });
  });

  describe('services', () => {
    it('replaces the set of services, adding and removing links', async () => {
      const [a, b, c] = await Promise.all([
        createService(db.dataSource.manager),
        createService(db.dataSource.manager),
        createService(db.dataSource.manager),
      ]);
      const professional = await createProfessional(db.dataSource.manager);

      await repository.replaceServices(professional.id, [a.id, b.id]);
      await repository.replaceServices(professional.id, [b.id, c.id]);

      expect(await repository.findServiceIds(professional.id)).toEqual(
        [b.id, c.id].sort(),
      );
    });

    it('is a silent no-op for a professional that does not exist', async () => {
      const service = await createService(db.dataSource.manager);
      const ghost = makeProfessional().id;

      await expect(
        repository.replaceServices(ghost, [service.id]),
      ).resolves.toBeUndefined();
      expect(await repository.findServiceIds(ghost)).toEqual([]);
    });

    it('clears every link when given an empty list', async () => {
      const service = await createService(db.dataSource.manager);
      const professional = await createProfessional(db.dataSource.manager);
      await repository.replaceServices(professional.id, [service.id]);

      await repository.replaceServices(professional.id, []);

      expect(await repository.findServiceIds(professional.id)).toEqual([]);
    });

    it('does not touch the links of other professionals', async () => {
      const service = await createService(db.dataSource.manager);
      const ana = await createProfessional(db.dataSource.manager);
      const bia = await createProfessional(db.dataSource.manager);
      await repository.replaceServices(ana.id, [service.id]);
      await repository.replaceServices(bia.id, [service.id]);

      await repository.replaceServices(ana.id, []);

      expect(await repository.findServiceIds(bia.id)).toEqual([service.id]);
    });
  });

  describe('concurrent replacements of the same professional', () => {
    it('never fails nor mixes sets when two service replacements race', async () => {
      const [a, b, c] = await Promise.all([
        createService(db.dataSource.manager),
        createService(db.dataSource.manager),
        createService(db.dataSource.manager),
      ]);
      const professional = await createProfessional(db.dataSource.manager);

      for (let round = 0; round < 5; round += 1) {
        await repository.replaceServices(professional.id, []);
        await Promise.all([
          repository.replaceServices(professional.id, [a.id, b.id]),
          repository.replaceServices(professional.id, [b.id, c.id]),
        ]);

        const result = await repository.findServiceIds(professional.id);
        const winners = [[a.id, b.id].sort(), [b.id, c.id].sort()];
        expect(winners).toContainEqual(result);
      }
    });

    it('leaves exactly one of the two schedules when replacements race', async () => {
      const professional = await createProfessional(db.dataSource.manager);
      const scheduleOf = (weekdays: number[]) =>
        weekdays.map((weekday) =>
          makeWorkingHours({ professionalId: professional.id, weekday }),
        );

      for (let round = 0; round < 5; round += 1) {
        await Promise.all([
          repository.replaceWorkingHours(
            professional.id,
            scheduleOf([1, 2, 3]),
          ),
          repository.replaceWorkingHours(professional.id, scheduleOf([4, 5])),
        ]);

        const weekdays = (await repository.findWorkingHours(professional.id))
          .map((h) => h.weekday)
          .sort((x, y) => x - y);
        expect([
          [1, 2, 3],
          [4, 5],
        ]).toContainEqual(weekdays);
      }
    });
  });

  describe('working hours', () => {
    it('is a silent no-op for a professional that does not exist', async () => {
      const ghost = makeProfessional().id;

      await expect(
        repository.replaceWorkingHours(ghost, [
          makeWorkingHours({ professionalId: ghost }),
        ]),
      ).resolves.toBeUndefined();
      expect(await repository.findWorkingHours(ghost)).toEqual([]);
    });

    it('replaces the weekly schedule of a professional only', async () => {
      const ana = await createProfessional(db.dataSource.manager);
      const bia = await createProfessional(db.dataSource.manager);
      await createWorkingHours(db.dataSource.manager, {
        professionalId: ana.id,
        weekday: 1,
      });
      await createWorkingHours(db.dataSource.manager, {
        professionalId: bia.id,
        weekday: 2,
      });

      await repository.replaceWorkingHours(ana.id, [
        makeWorkingHours({
          professionalId: ana.id,
          weekday: 3,
          startTime: '10:00:00',
          endTime: '16:00:00',
        }),
      ]);

      const anaHours = await repository.findWorkingHours(ana.id);
      expect(anaHours).toHaveLength(1);
      expect(anaHours[0]).toMatchObject({
        weekday: 3,
        startTime: '10:00:00',
        endTime: '16:00:00',
      });
      expect(await repository.findWorkingHours(bia.id)).toHaveLength(1);
    });

    it('rejects a window that ends before it starts', async () => {
      const ana = await createProfessional(db.dataSource.manager);

      await expect(
        repository.replaceWorkingHours(ana.id, [
          makeWorkingHours({
            professionalId: ana.id,
            startTime: '18:00:00',
            endTime: '09:00:00',
          }),
        ]),
      ).rejects.toThrow(/ck_working_hours_interval/);
    });

    it('rejects a weekday outside 1..7', async () => {
      const ana = await createProfessional(db.dataSource.manager);

      await expect(
        repository.replaceWorkingHours(ana.id, [
          makeWorkingHours({ professionalId: ana.id, weekday: 8 }),
        ]),
      ).rejects.toThrow(/ck_working_hours_weekday/);
    });

    it('keeps the previous schedule when the new one is invalid', async () => {
      const ana = await createProfessional(db.dataSource.manager);
      await createWorkingHours(db.dataSource.manager, {
        professionalId: ana.id,
        weekday: 1,
      });

      await expect(
        repository.replaceWorkingHours(ana.id, [
          makeWorkingHours({ professionalId: ana.id, weekday: 9 }),
        ]),
      ).rejects.toThrow();

      expect(await repository.findWorkingHours(ana.id)).toHaveLength(1);
    });
  });
});
