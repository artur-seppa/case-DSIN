import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { Role } from '../../../shared/auth/role.js';
import { AccessTokenService } from '../../application/ports/access-token.service.js';
import { AuthSettings } from '../../application/ports/auth-settings.js';

interface AccessTokenPayload {
  sub: string;
  role: Role;
}

const ALGORITHM = 'HS256';

@Injectable()
export class JwtAccessTokenService extends AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly settings: AuthSettings,
  ) {
    super();
  }

  sign(claims: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = { sub: claims.id, role: claims.role };
    return this.jwt.signAsync(payload, {
      algorithm: ALGORITHM,
      expiresIn: this.settings.accessTokenTtlMinutes * 60,
    });
  }

  async verify(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        algorithms: [ALGORITHM],
      });
      if (!payload.sub || !Object.values(Role).includes(payload.role)) {
        return null;
      }
      return { id: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }
}
