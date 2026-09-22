import {
  createRefreshToken,
  makeRefreshToken,
} from '../../../testing/factories/refresh-token.factory.js';
import { createUser } from '../../../testing/factories/user.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { RefreshToken } from '../../domain/refresh-token.entity.js';
import { TypeOrmRefreshTokenRepository } from './typeorm-refresh-token.repository.js';

describe('TypeOrmRefreshTokenRepository', () => {
  const db = useTestDatabase();
  let repository: TypeOrmRefreshTokenRepository;

  beforeEach(() => {
    repository = new TypeOrmRefreshTokenRepository(
      db.dataSource.getRepository(RefreshToken),
    );
  });

  it('persists a token and finds it by hash', async () => {
    const user = await createUser(db.dataSource.manager);
    const token = makeRefreshToken({ userId: user.id });

    await repository.insert(token);

    const found = await repository.findByTokenHash(token.tokenHash);
    expect(found).toMatchObject({
      id: token.id,
      userId: user.id,
      familyId: token.familyId,
      revokedAt: null,
    });
  });

  it('answers 409 in Portuguese when the token hash collides, instead of leaking the raw driver error', async () => {
    const user = await createUser(db.dataSource.manager);
    const token = makeRefreshToken({ userId: user.id });
    await repository.insert(token);

    const colliding = makeRefreshToken({
      userId: user.id,
      tokenHash: token.tokenHash,
    });

    await expect(repository.insert(colliding)).rejects.toMatchObject({
      status: 409,
      response: {
        message: 'Não foi possível concluir a autenticação. Tente novamente',
      },
    });
  });

  it('returns null when the hash is unknown', async () => {
    expect(await repository.findByTokenHash('0'.repeat(64))).toBeNull();
  });

  it('refuses a token that points to a non-existent user', async () => {
    const orphan = makeRefreshToken({ userId: 'NOSUCHUSER0000000000000000' });

    await expect(repository.insert(orphan)).rejects.toThrow();
  });

  it('revokes an active token only once', async () => {
    const user = await createUser(db.dataSource.manager);
    const token = await createRefreshToken(db.dataSource.manager, {
      userId: user.id,
    });
    const at = new Date('2026-09-21T12:00:00.000Z');

    const results = await Promise.all([
      repository.revokeIfActive(token.id, at),
      repository.revokeIfActive(token.id, at),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const stored = await repository.findByTokenHash(token.tokenHash);
    expect(stored?.revokedAt?.getTime()).toBe(at.getTime());
  });

  it('revokes every active token of a family and leaves the others alone', async () => {
    const user = await createUser(db.dataSource.manager);
    const first = await createRefreshToken(db.dataSource.manager, {
      userId: user.id,
    });
    const sibling = await createRefreshToken(db.dataSource.manager, {
      userId: user.id,
      familyId: first.familyId,
    });
    const other = await createRefreshToken(db.dataSource.manager, {
      userId: user.id,
    });
    const at = new Date('2026-09-21T12:00:00.000Z');

    await repository.revokeFamily(first.familyId, at);

    expect(
      (await repository.findByTokenHash(first.tokenHash))?.isRevoked(),
    ).toBe(true);
    expect(
      (await repository.findByTokenHash(sibling.tokenHash))?.isRevoked(),
    ).toBe(true);
    expect(
      (await repository.findByTokenHash(other.tokenHash))?.isRevoked(),
    ).toBe(false);
  });
});
