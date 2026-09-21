import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './shared/config/env.validation.js';
import { registerHttpSecurity } from './shared/http/http-security.js';
import { createSerializerInterceptor } from './shared/http/serializer.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  await registerHttpSecurity(app, config);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(createSerializerInterceptor(app.get(Reflector)));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Cabeleleila Leila API')
      .setDescription('Sistema de agendamento online do salão')
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

await bootstrap();
