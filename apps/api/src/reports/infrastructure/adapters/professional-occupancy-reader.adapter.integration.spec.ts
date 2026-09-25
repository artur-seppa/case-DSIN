import { createProfessional } from '../../../testing/factories/professional.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { Professional } from '../../../professionals/domain/professional.entity.js';
import { WorkingHours } from '../../../professionals/domain/working-hours.entity.js';
import { TypeOrmProfessionalRepository } from '../../../professionals/infrastructure/persistence/typeorm-professional.repository.js';
import { ProfessionalOccupancyReaderAdapter } from './professional-occupancy-reader.adapter.js';

describe('ProfessionalOccupancyReaderAdapter', () => {
  const db = useTestDatabase();
  let adapter: ProfessionalOccupancyReaderAdapter;

  beforeEach(() => {
    const repository = new TypeOrmProfessionalRepository(db.dataSource.getRepository(Professional));
    adapter = new ProfessionalOccupancyReaderAdapter(repository);
  });

  it('sums working-hours minutes per professional, including those with no window at workingMinutes: 0', async () => {
    const withHours = await createProfessional(db.dataSource.manager, { name: 'Bia' });
    await db.dataSource.getRepository(WorkingHours).save([
      Object.assign(new WorkingHours(), {
        professionalId: withHours.id,
        weekday: 1,
        startTime: '09:00',
        endTime: '18:00',
      }),
      Object.assign(new WorkingHours(), {
        professionalId: withHours.id,
        weekday: 2,
        startTime: '09:00',
        endTime: '12:00',
      }),
    ]);
    const withoutHours = await createProfessional(db.dataSource.manager, { name: 'SemExpediente' });

    const rows = await adapter.workingMinutesByProfessional();

    expect(rows).toEqual(
      expect.arrayContaining([
        { professionalId: withHours.id, name: 'Bia', workingMinutes: 720 },
        { professionalId: withoutHours.id, name: 'SemExpediente', workingMinutes: 0 },
      ]),
    );
  });

  it('returns every professional at workingMinutes: 0 when none has working hours', async () => {
    const professional = await createProfessional(db.dataSource.manager);

    const rows = await adapter.workingMinutesByProfessional();

    expect(rows).toEqual([{ professionalId: professional.id, name: professional.name, workingMinutes: 0 }]);
  });
});
