import { Role } from '../shared/auth/role.js';
import { User, type UserProps } from '../users/domain/user.entity.js';

let userSequence = 0;

export function makeUser(overrides: Partial<UserProps> = {}): User {
  userSequence += 1;
  const at = new Date('2026-09-01T12:00:00.000Z');

  return Object.assign(new User(), {
    id: `USER${String(userSequence).padStart(22, '0')}`,
    name: `User ${userSequence}`,
    email: `user${userSequence}@example.com`,
    phone: null,
    passwordHash: 'hashed:password123',
    role: Role.CLIENT,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  });
}
