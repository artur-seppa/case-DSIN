import { Injectable, NotFoundException } from '@nestjs/common';
import { Clock } from '../../../shared/time/clock.js';
import { GetUserByIdUseCase } from '../../../users/application/use-cases/get-user-by-id.use-case.js';
import { InvalidRefreshTokenException } from '../../domain/exceptions.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';
import { RefreshTokenCodec } from '../ports/refresh-token.codec.js';
import { SessionIssuer, type Session } from './session-issuer.js';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly codec: RefreshTokenCodec,
    private readonly getUserById: GetUserByIdUseCase,
    private readonly sessionIssuer: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(rawToken: string): Promise<Session> {
    const now = this.clock.now();
    const token = await this.refreshTokens.findByTokenHash(
      this.codec.hash(rawToken),
    );

    if (!token) {
      throw new InvalidRefreshTokenException();
    }

    if (token.isRevoked()) {
      await this.refreshTokens.revokeFamily(token.familyId, now);
      throw new InvalidRefreshTokenException();
    }

    if (token.isExpired(now)) {
      throw new InvalidRefreshTokenException();
    }

    const won = await this.refreshTokens.revokeIfActive(token.id, now);
    if (!won) {
      await this.refreshTokens.revokeFamily(token.familyId, now);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.getUserById
      .execute(token.userId)
      .catch((error: unknown) => {
        throw error instanceof NotFoundException
          ? new InvalidRefreshTokenException()
          : error;
      });
    return this.sessionIssuer.issue(user, token.familyId);
  }
}
