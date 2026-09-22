import { NotFoundException } from '@nestjs/common';
import { Clock } from '../../../shared/time/clock.js';
import { makeRefreshToken } from '../../../testing/factories/refresh-token.factory.js';
import { makeUser } from '../../../testing/factories/user.factory.js';
import { GetUserByIdUseCase } from '../../../users/application/use-cases/get-user-by-id.use-case.js';
import { InvalidRefreshTokenException } from '../../domain/exceptions.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';
import { RefreshTokenCodec } from '../ports/refresh-token.codec.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';
import { SessionIssuer, type Session } from './session-issuer.js';

const now = new Date('2026-09-21T12:00:00.000Z');

function setup() {
  const user = makeUser();
  const token = makeRefreshToken({
    userId: user.id,
    tokenHash: 'hash-of:raw',
    expiresAt: new Date(now.getTime() + 60_000),
  });
  const refreshTokens = {
    findByTokenHash: vi
      .fn<RefreshTokenRepository['findByTokenHash']>()
      .mockResolvedValue(token),
    revokeIfActive: vi
      .fn<RefreshTokenRepository['revokeIfActive']>()
      .mockResolvedValue(true),
    revokeFamily: vi
      .fn<RefreshTokenRepository['revokeFamily']>()
      .mockResolvedValue(undefined),
  };
  const codec = {
    hash: vi
      .fn<RefreshTokenCodec['hash']>()
      .mockImplementation((raw) => `hash-of:${raw}`),
  };
  const getUserById = {
    execute: vi.fn<GetUserByIdUseCase['execute']>().mockResolvedValue(user),
  };
  const sessionIssuer = {
    issue: vi
      .fn<SessionIssuer['issue']>()
      .mockResolvedValue({ user } as Session),
  };
  const clock = { now: vi.fn<Clock['now']>().mockReturnValue(now) };
  const useCase = new RefreshSessionUseCase(
    refreshTokens as unknown as RefreshTokenRepository,
    codec as unknown as RefreshTokenCodec,
    getUserById as unknown as GetUserByIdUseCase,
    sessionIssuer as unknown as SessionIssuer,
    clock as unknown as Clock,
  );
  return {
    refreshTokens,
    getUserById,
    sessionIssuer,
    clock,
    user,
    token,
    useCase,
  };
}

describe('RefreshSessionUseCase', () => {
  it('rotates the token: revokes the used one and issues a new one in the same family', async () => {
    const { refreshTokens, sessionIssuer, user, token, useCase } = setup();

    const session = await useCase.execute('raw');

    expect(refreshTokens.findByTokenHash).toHaveBeenCalledWith('hash-of:raw');
    expect(refreshTokens.revokeIfActive).toHaveBeenCalledWith(token.id, now);
    expect(sessionIssuer.issue).toHaveBeenCalledWith(user, token.familyId);
    expect(session.user).toBe(user);
  });

  it('rejects a token that does not exist', async () => {
    const { refreshTokens, sessionIssuer, useCase } = setup();
    refreshTokens.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute('never-issued')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('rejects an expired token without revoking anything', async () => {
    const { refreshTokens, clock, token, useCase } = setup();
    clock.now.mockReturnValue(new Date(token.expiresAt.getTime() + 1));

    await expect(useCase.execute('raw')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    expect(refreshTokens.revokeIfActive).not.toHaveBeenCalled();
    expect(refreshTokens.revokeFamily).not.toHaveBeenCalled();
  });

  it('treats a reused token as theft: revokes the whole family and issues nothing', async () => {
    const { refreshTokens, sessionIssuer, token, useCase } = setup();
    token.revokedAt = new Date();

    await expect(useCase.execute('raw')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith(
      token.familyId,
      now,
    );
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('loses the race gracefully: when another request already revoked the token, revokes the family', async () => {
    const { refreshTokens, sessionIssuer, token, useCase } = setup();
    refreshTokens.revokeIfActive.mockResolvedValue(false);

    await expect(useCase.execute('raw')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith(
      token.familyId,
      now,
    );
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('answers as an invalid token when the user no longer exists', async () => {
    const { getUserById, useCase } = setup();
    getUserById.execute.mockRejectedValue(
      new NotFoundException('Usuário não encontrado'),
    );

    await expect(useCase.execute('raw')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('does not swallow unexpected errors', async () => {
    const { sessionIssuer, useCase } = setup();
    const failure = new Error('database down');
    sessionIssuer.issue.mockRejectedValue(failure);

    await expect(useCase.execute('raw')).rejects.toBe(failure);
  });
});
