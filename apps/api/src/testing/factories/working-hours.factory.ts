import type { EntityManager } from 'typeorm';
import { WorkingHours } from '../../professionals/domain/working-hours.entity.js';

type WorkingHoursOverrides = Partial<WorkingHours> &
  Pick<WorkingHours, 'professionalId'>;

export function makeWorkingHours(
  overrides: WorkingHoursOverrides,
): WorkingHours {
  return Object.assign(new WorkingHours(), {
    weekday: 1,
    startTime: '09:00:00',
    endTime: '18:00:00',
    ...overrides,
  });
}

export function createWorkingHours(
  manager: EntityManager,
  overrides: WorkingHoursOverrides,
): Promise<WorkingHours> {
  return manager.save(
    manager.create(WorkingHours, makeWorkingHours(overrides)),
  );
}
