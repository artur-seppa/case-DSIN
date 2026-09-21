import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';

export abstract class AccessTokenService {
  abstract sign(claims: AuthenticatedUser): Promise<string>;
  abstract verify(token: string): Promise<AuthenticatedUser | null>;
}
