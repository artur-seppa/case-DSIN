import { AccessTokenService } from '../auth/application/ports/access-token.service.js';
import type { AuthSettings } from '../auth/application/ports/auth-settings.js';
import { RefreshTokenCodec } from '../auth/application/ports/refresh-token.codec.js';
import { RefreshToken } from '../auth/domain/refresh-token.entity.js';
import { RefreshTokenRepository } from '../auth/domain/refresh-token.repository.js';
import type { AuthenticatedUser } from '../shared/auth/authenticated-user.js';
import { Role } from '../shared/auth/role.js';

export const testAuthSettings: AuthSettings = {
  accessTokenTtlMinutes: 15,
  refreshTokenTtlDays: 7,
};

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
  readonly items = new Map<string, RefreshToken>();

  insert(token: RefreshToken): Promise<void> {
    this.items.set(token.id, token);
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const found = [...this.items.values()].find(
      (token) => token.tokenHash === tokenHash,
    );
    return Promise.resolve(
      found ? Object.assign(new RefreshToken(), found) : null,
    );
  }

  revokeIfActive(id: string, at: Date): Promise<boolean> {
    const token = this.items.get(id);
    if (!token || token.revokedAt !== null) {
      return Promise.resolve(false);
    }
    token.revokedAt = at;
    return Promise.resolve(true);
  }

  revokeFamily(familyId: string, at: Date): Promise<void> {
    for (const token of this.items.values()) {
      if (token.familyId === familyId && token.revokedAt === null) {
        token.revokedAt = at;
      }
    }
    return Promise.resolve();
  }

  byFamily(familyId: string): RefreshToken[] {
    return [...this.items.values()].filter(
      (token) => token.familyId === familyId,
    );
  }
}

export class FakeAccessTokenService extends AccessTokenService {
  sign(claims: AuthenticatedUser): Promise<string> {
    return Promise.resolve(`access:${claims.id}:${claims.role}`);
  }

  verify(token: string): Promise<AuthenticatedUser | null> {
    const [prefix, id, role] = token.split(':');
    if (prefix !== 'access' || !id || !role) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ id, role: role as Role });
  }
}

export class FakeRefreshTokenCodec extends RefreshTokenCodec {
  private counter = 0;

  generate(): { token: string; hash: string } {
    this.counter += 1;
    const token = `raw-${this.counter}`;
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return `hash-of:${token}`;
  }
}
