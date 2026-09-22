import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { registerHttpSecurity } from './http-security.js';
import { createSerializerInterceptor } from './serializer.js';
import { createValidationPipe } from './validation-pipe.js';

export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  await registerHttpSecurity(app, config);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(createSerializerInterceptor(app.get(Reflector)));
}
