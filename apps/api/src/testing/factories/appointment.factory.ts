import { faker } from '@faker-js/faker';
import type { EntityManager } from 'typeorm';
import { Appointment } from '../../scheduling/domain/entities/appointment.entity.js';

export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  const at = faker.date.recent();

  return Object.assign(new Appointment(), {
    clientId: faker.string.ulid(),
    notes: null,
    reminderSentAt: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  });
}

export function createAppointment(
  manager: EntityManager,
  overrides: Partial<Appointment> = {},
): Promise<Appointment> {
  return manager.save(manager.create(Appointment, makeAppointment(overrides)));
}
