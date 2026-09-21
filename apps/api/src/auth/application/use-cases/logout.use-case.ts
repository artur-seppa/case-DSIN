import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/time/clock.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';
import { RefreshTokenCodec } from '../ports/refresh-token.codec.js';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly codec: RefreshTokenCodec,
    private readonly clock: Clock,
  ) {}

  async execute(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const token = await this.refreshTokens.findByTokenHash(
      this.codec.hash(rawToken),
    );
    if (token) {
      await this.refreshTokens.revokeIfActive(token.id, this.clock.now());
    }
  }
}
