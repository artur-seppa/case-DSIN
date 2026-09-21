import fastifyCookie from '@fastify/cookie';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import type { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { EnvironmentVariables } from '../config/env.validation.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function registerHttpSecurity(
  app: NestFastifyApplication,
  config: ConfigService<EnvironmentVariables, true>,
): Promise<void> {
  await app.register(fastifyCookie, {
    secret: config.get('COOKIE_SECRET', { infer: true }),
  });
  await app.register(fastifyCsrfProtection, {
    cookieOpts: {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
    },
  });

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    if (SAFE_METHODS.has(request.method)) {
      done();
      return;
    }
    fastify.csrfProtection(request, reply, done);
  });
}
