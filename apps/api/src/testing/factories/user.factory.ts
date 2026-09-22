import { faker } from '@faker-js/faker';
import type { EntityManager } from 'typeorm';
import { Role } from '../../shared/auth/role.js';
import { hashPassword } from '../../shared/security/password.js';
import { User, type UserProps } from '../../users/domain/user.entity.js';

export const DEFAULT_PASSWORD = 'password123';

const DEFAULT_PASSWORD_HASH = await hashPassword(DEFAULT_PASSWORD);

function uniqueEmail(): string {
  const local = faker.internet.username().toLowerCase().replace(/\W/g, '');
  const suffix = faker.string.alphanumeric({ length: 6, casing: 'lower' });
  return `${local}.${suffix}@example.com`;
}

export function makeUser(overrides: Partial<UserProps> = {}): User {
  const at = faker.date.recent();

  return Object.assign(new User(), {
    name: faker.person.fullName(),
    email: uniqueEmail(),
    phone: `+55119${faker.string.numeric(8)}`,
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.CLIENT,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  });
}

export async function createUser(
  manager: EntityManager,
  overrides: Partial<UserProps> & { password?: string } = {},
): Promise<User> {
  const { password, ...props } = overrides;
  const user = manager.create(User, makeUser(props));
  if (password) {
    await user.setPassword(password);
  }
  return manager.save(user);
}
