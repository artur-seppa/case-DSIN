import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../../../shared/id/id-generator.js';
import { Clock } from '../../../shared/time/clock.js';
import type { User } from '../../../users/domain/user.entity.js';
import { RefreshToken } from '../../domain/refresh-token.entity.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';
import { AccessTokenService } from '../ports/access-token.service.js';
import { AuthSettings } from '../ports/auth-settings.js';
import { RefreshTokenCodec } from '../ports/refresh-token.codec.js';

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class SessionIssuer {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly codec: RefreshTokenCodec,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: AuthSettings,
  ) {}

  async issue(user: User, familyId?: string): Promise<Session> {
    const now = this.clock.now();
    const { token, hash } = this.codec.generate();
    const expiresAt = new Date(
      now.getTime() + this.settings.refreshTokenTtlDays * 24 * 60 * 60_000,
    );

    await this.refreshTokens.insert(
      Object.assign(new RefreshToken(), {
        id: this.ids.generate(),
        userId: user.id,
        familyId: familyId ?? this.ids.generate(),
        tokenHash: hash,
        expiresAt,
        revokedAt: null,
        createdAt: now,
      }),
    );

    return {
      user,
      accessToken: await this.accessTokens.sign({
        id: user.id,
        role: user.role,
      }),
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    };
  }
}
