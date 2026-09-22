import { Clock } from '../../../shared/time/clock.js';
import { makeRefreshToken } from '../../../testing/factories/refresh-token.factory.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';
import { RefreshTokenCodec } from '../ports/refresh-token.codec.js';
import { LogoutUseCase } from './logout.use-case.js';

const now = new Date('2026-09-21T12:00:00.000Z');

function setup() {
  const refreshTokens = {
    findByTokenHash: vi.fn<RefreshTokenRepository['findByTokenHash']>(),
    revokeIfActive: vi
      .fn<RefreshTokenRepository['revokeIfActive']>()
      .mockResolvedValue(true),
  };
  const codec = {
    hash: vi
      .fn<RefreshTokenCodec['hash']>()
      .mockImplementation((raw) => `hash-of:${raw}`),
  };
  const clock = { now: vi.fn<Clock['now']>().mockReturnValue(now) };
  const useCase = new LogoutUseCase(
    refreshTokens as unknown as RefreshTokenRepository,
    codec as unknown as RefreshTokenCodec,
    clock as unknown as Clock,
  );
  return { refreshTokens, useCase };
}

describe('LogoutUseCase', () => {
  it('revokes the refresh token that matches the informed one', async () => {
    const { refreshTokens, useCase } = setup();
    const token = makeRefreshToken({
      userId: 'USER',
      tokenHash: 'hash-of:raw-1',
    });
    refreshTokens.findByTokenHash.mockResolvedValue(token);

    await useCase.execute('raw-1');

    expect(refreshTokens.findByTokenHash).toHaveBeenCalledWith('hash-of:raw-1');
    expect(refreshTokens.revokeIfActive).toHaveBeenCalledWith(token.id, now);
  });

  it('is idempotent and silent for an unknown token', async () => {
    const { refreshTokens, useCase } = setup();
    refreshTokens.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute('never-issued')).resolves.toBeUndefined();
    expect(refreshTokens.revokeIfActive).not.toHaveBeenCalled();
  });

  it('does nothing when no token is sent', async () => {
    const { refreshTokens, useCase } = setup();

    await expect(useCase.execute(undefined)).resolves.toBeUndefined();
    expect(refreshTokens.findByTokenHash).not.toHaveBeenCalled();
  });
});
