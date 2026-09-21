import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import '@fastify/cookie';
import type { FastifyReply } from 'fastify';
import type { EnvironmentVariables } from '../../../shared/config/env.validation.js';
import { AuthSettings } from '../../application/ports/auth-settings.js';
import type { Session } from '../../application/use-cases/session-issuer.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/auth';

@Injectable()
export class SessionCookies {
  private readonly secure: boolean;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly settings: AuthSettings,
  ) {
    this.secure = config.get('COOKIE_SECURE', { infer: true });
  }

  set(reply: FastifyReply, session: Session): void {
    reply.setCookie(ACCESS_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.settings.accessTokenTtlMinutes * 60,
    });
    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshTokenExpiresAt,
    });
  }

  clear(reply: FastifyReply): void {
    reply.clearCookie(ACCESS_COOKIE, { path: '/' });
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }
}
