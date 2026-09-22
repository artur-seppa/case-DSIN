import { Controller, Get, Post, Res } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import '@fastify/csrf-protection';
import type { FastifyReply } from 'fastify';
import { CurrentUser, Public, Roles } from '../../../shared/auth/decorators.js';
import { Role } from '../../../shared/auth/role.js';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import type { EnvironmentVariables } from '../../../shared/config/env.validation.js';
import { CsrfExceptionFilter } from '../../../shared/http/csrf-exception.filter.js';
import { registerHttpSecurity } from '../../../shared/http/http-security.js';
import { AccessTokenService } from '../../application/ports/access-token.service.js';
import { ACCESS_COOKIE } from './cookies.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Controller()
class SampleController {
  @Public()
  @Get('csrf')
  csrf(@Res({ passthrough: true }) reply: FastifyReply) {
    return { csrfToken: reply.generateCsrf() };
  }

  @Public()
  @Get('open')
  open() {
    return { ok: true };
  }

  @Public()
  @Get('boom')
  boom() {
    throw new Error('secret internal detail');
  }

  @Get('private')
  privateRoute(@CurrentUser() user: AuthenticatedUser) {
    return { id: user.id };
  }

  @Roles([Role.ADMIN])
  @Get('admin')
  admin() {
    return { ok: true };
  }

  @Post('write')
  write() {
    return { written: true };
  }
}

const settings: Record<string, unknown> = {
  COOKIE_SECRET: 'c'.repeat(32),
  COOKIE_SECURE: false,
};

const accessTokens = {
  verify: vi.fn<AccessTokenService['verify']>().mockImplementation((token) => {
    const [prefix, id, role] = token.split(':');
    return Promise.resolve(
      prefix === 'access' && id && role ? { id, role: role as Role } : null,
    );
  }),
};

let app: NestFastifyApplication;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: [SampleController],
    providers: [
      { provide: AccessTokenService, useValue: accessTokens },
      { provide: APP_GUARD, useClass: AccessTokenGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_FILTER, useClass: CsrfExceptionFilter },
    ],
  }).compile();

  app = module.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await registerHttpSecurity(app, {
    get: (key: string) => settings[key],
  } as unknown as ConfigService<EnvironmentVariables, true>);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
});

const session = (role: Role) => `${ACCESS_COOKIE}=access:USER1:${role}`;

async function csrf() {
  const response = await app.inject({ method: 'GET', url: '/csrf' });
  const secret = ([] as string[])
    .concat(response.headers['set-cookie'] ?? [])
    .map((cookie) => cookie.split(';')[0] ?? '')
    .find((cookie) => cookie.startsWith('_csrf='));
  return {
    token: response.json<{ csrfToken: string }>().csrfToken,
    secret: secret ?? '',
  };
}

describe('authentication and roles (global guards)', () => {
  it('lets a @Public route through without a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/open' });

    expect(response.statusCode).toBe(200);
  });

  it('protects every route by default: no session means 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/private' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ message: 'Não autenticado' });
  });

  it('answers 401 for a tampered access cookie', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { cookie: `${ACCESS_COOKIE}=garbage` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('lets any authenticated user into a route that declares no roles', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { cookie: session(Role.CLIENT) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 'USER1' });
  });

  it('answers 403 to a CLIENT on an ADMIN route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: session(Role.CLIENT) },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      message: 'Você não tem permissão para esta ação',
    });
  });

  it('lets an ADMIN into an ADMIN route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { cookie: session(Role.ADMIN) },
    });

    expect(response.statusCode).toBe(200);
  });

  it('authenticates before checking the role: no session on an ADMIN route is 401, not 403', async () => {
    const response = await app.inject({ method: 'GET', url: '/admin' });

    expect(response.statusCode).toBe(401);
  });
});

describe('CSRF protection', () => {
  it('rejects a write without a token with a stable code and a Portuguese message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/write',
      headers: { cookie: session(Role.CLIENT) },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      statusCode: 403,
      code: 'CSRF_INVALID',
      message: 'Token CSRF ausente ou inválido',
    });
  });

  it('rejects a write with a wrong token', async () => {
    const { secret } = await csrf();

    const response = await app.inject({
      method: 'POST',
      url: '/write',
      headers: {
        cookie: `${secret}; ${session(Role.CLIENT)}`,
        'x-csrf-token': 'not-the-token',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'CSRF_INVALID' });
  });

  it('accepts a write with the token and its secret cookie', async () => {
    const { token, secret } = await csrf();

    const response = await app.inject({
      method: 'POST',
      url: '/write',
      headers: {
        cookie: `${secret}; ${session(Role.CLIENT)}`,
        'x-csrf-token': token,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ written: true });
  });

  it('checks CSRF before authentication: a valid token without a session is 401', async () => {
    const { token, secret } = await csrf();

    const response = await app.inject({
      method: 'POST',
      url: '/write',
      headers: { cookie: secret, 'x-csrf-token': token },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('every other error keeps the default Nest behavior', () => {
  it('answers an unknown route with the standard 404 body', async () => {
    const response = await app.inject({ method: 'GET', url: '/nothing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Not Found' });
  });

  it('hides the details of an unexpected error behind a generic 500', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
