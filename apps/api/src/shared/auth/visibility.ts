import type { AuthenticatedUser } from './authenticated-user.js';
import { Role } from './role.js';

export function canSeeInactive(
  actor: AuthenticatedUser,
  requested: boolean | undefined,
): boolean {
  return requested === true && actor.role === Role.ADMIN;
}
