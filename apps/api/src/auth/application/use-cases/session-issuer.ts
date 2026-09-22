import { Injectable } from '@nestjs/common';
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
    private readonly clock: Clock,
    private readonly settings: AuthSettings,
  ) {}

  async issue(user: User, familyId?: string): Promise<Session> {
    const now = this.clock.now();
    const { token: rawToken, hash } = this.codec.generate();
    const expiresAt = new Date(
      now.getTime() + this.settings.refreshTokenTtlDays * 24 * 60 * 60_000,
    );

    const token = Object.assign(new RefreshToken(), {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      revokedAt: null,
    });
    if (familyId) {
      token.familyId = familyId;
    }
    await this.refreshTokens.insert(token);

    return {
      user,
      accessToken: await this.accessTokens.sign({
        id: user.id,
        role: user.role,
      }),
      refreshToken: rawToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }
}
