import { faker } from '@faker-js/faker';
import type { EntityManager } from 'typeorm';
import { Service } from '../../services/domain/service.entity.js';

export function makeService(overrides: Partial<Service> = {}): Service {
  const at = faker.date.recent();

  return Object.assign(new Service(), {
    name: faker.commerce.productName(),
    durationMinutes: faker.helpers.arrayElement([30, 45, 60, 90, 120]),
    priceCents: faker.number.int({ min: 2000, max: 30000 }),
    active: true,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  });
}

export function createService(
  manager: EntityManager,
  overrides: Partial<Service> = {},
): Promise<Service> {
  return manager.save(manager.create(Service, makeService(overrides)));
}
