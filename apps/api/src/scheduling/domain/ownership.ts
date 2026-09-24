import type { AuthenticatedUser } from '../../shared/auth/authenticated-user.js';
import { Role } from '../../shared/auth/role.js';

export function forbidsAccess(actor: AuthenticatedUser, clientId: string): boolean {
  return actor.role === Role.CLIENT && clientId !== actor.id;
}
