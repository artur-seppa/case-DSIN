import { faker } from '@faker-js/faker';
import type { EntityManager } from 'typeorm';
import { RefreshToken } from '../../auth/domain/refresh-token.entity.js';

type RefreshTokenOverrides = Partial<RefreshToken> &
  Pick<RefreshToken, 'userId'>;

export function makeRefreshToken(
  overrides: RefreshTokenOverrides,
): RefreshToken {
  const at = new Date();

  return Object.assign(new RefreshToken(), {
    tokenHash: faker.string.hexadecimal({
      length: 64,
      casing: 'lower',
      prefix: '',
    }),
    expiresAt: new Date(at.getTime() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: at,
    ...overrides,
  });
}

export function createRefreshToken(
  manager: EntityManager,
  overrides: RefreshTokenOverrides,
): Promise<RefreshToken> {
  return manager.save(
    manager.create(RefreshToken, makeRefreshToken(overrides)),
  );
}
