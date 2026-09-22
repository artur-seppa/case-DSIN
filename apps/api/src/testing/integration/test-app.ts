import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { configureApp } from '../../shared/http/configure-app.js';
import { resetDatabase } from './database.js';
import { TestClient } from './test-client.js';

export class TestApp {
  constructor(
    readonly app: NestFastifyApplication,
    readonly dataSource: DataSource,
  ) {}

  client(): TestClient {
    return new TestClient(this.app);
  }

  reset(): Promise<void> {
    return resetDatabase(this.dataSource);
  }

  close(): Promise<void> {
    return this.app.close();
  }
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return new TestApp(app, app.get(DataSource));
}
