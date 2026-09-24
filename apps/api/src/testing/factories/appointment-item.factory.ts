import { faker } from '@faker-js/faker';
import type { EntityManager } from 'typeorm';
import { AppointmentItem } from '../../scheduling/domain/entities/appointment-item.entity.js';
import { ItemStatus } from '../../scheduling/domain/rules/item-status.js';

export function makeAppointmentItem(
  overrides: Partial<AppointmentItem> = {},
): AppointmentItem {
  const startsAt = faker.date.soon();
  const endsAt = new Date(startsAt.getTime() + 30 * 60_000);

  return Object.assign(new AppointmentItem(), {
    appointmentId: faker.string.ulid(),
    serviceId: faker.string.ulid(),
    professionalId: faker.string.ulid(),
    startsAt,
    endsAt,
    priceCents: faker.number.int({ min: 1000, max: 20000 }),
    status: ItemStatus.PENDING,
    ...overrides,
  });
}

export function createAppointmentItem(
  manager: EntityManager,
  overrides: Partial<AppointmentItem> = {},
): Promise<AppointmentItem> {
  return manager.save(manager.create(AppointmentItem, makeAppointmentItem(overrides)));
}
