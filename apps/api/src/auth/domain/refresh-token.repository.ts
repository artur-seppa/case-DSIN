import type { RefreshToken } from './refresh-token.entity.js';

export abstract class RefreshTokenRepository {
  abstract insert(token: RefreshToken): Promise<void>;
  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  abstract revokeIfActive(id: string, at: Date): Promise<boolean>;
  abstract revokeFamily(familyId: string, at: Date): Promise<void>;
}
