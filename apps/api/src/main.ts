import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './shared/config/env.validation.js';
import { configureApp } from './shared/http/configure-app.js';
import { attachCsrfToken } from './shared/http/swagger-csrf.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await configureApp(app);
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Cabeleleila Leila API')
      .setDescription('Sistema de agendamento online do salão')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .addApiKey({ type: 'apiKey', name: 'x-csrf-token', in: 'header' }, 'csrf')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      requestInterceptor: attachCsrfToken,
    },
  });

  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

await bootstrap();
