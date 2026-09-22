import { faker } from '@faker-js/faker';
import type { EntityManager } from 'typeorm';
import { Professional } from '../../professionals/domain/professional.entity.js';

export function makeProfessional(
  overrides: Partial<Professional> = {},
): Professional {
  const at = faker.date.recent();

  return Object.assign(new Professional(), {
    name: faker.person.fullName(),
    active: true,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  });
}

export function createProfessional(
  manager: EntityManager,
  overrides: Partial<Professional> = {},
): Promise<Professional> {
  return manager.save(
    manager.create(Professional, makeProfessional(overrides)),
  );
}
