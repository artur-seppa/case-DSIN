import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

const TEST_SUFFIX = '_test';
const SRC_ROOT = join(import.meta.dirname, '../..');
const MIGRATIONS_DIR = join(SRC_ROOT, 'shared/database/migrations');

export function loadEnv(): void {
  const envFile = join(SRC_ROOT, '../../../.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

export function testDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!url.pathname.endsWith(TEST_SUFFIX)) {
    url.pathname = `${url.pathname}${TEST_SUFFIX}`;
  }
  return url.toString();
}

export function testDatabaseName(): string {
  return new URL(testDatabaseUrl()).pathname.slice(1);
}

export function maintenanceDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl());
  url.pathname = url.pathname.slice(0, -TEST_SUFFIX.length);
  return url.toString();
}

async function importClasses(
  directory: string,
  suffix: string,
): Promise<(new () => unknown)[]> {
  const files = readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith(suffix))
    .sort();
  const classes: (new () => unknown)[] = [];
  for (const file of files) {
    const module = await import(join(directory, file));
    for (const value of Object.values<unknown>(module)) {
      if (typeof value === 'function') {
        classes.push(value as new () => unknown);
      }
    }
  }
  return classes;
}

export async function createTestDataSource(
  withMigrations = false,
): Promise<DataSource> {
  const entities = await importClasses(SRC_ROOT, '.entity.ts');
  const migrations = withMigrations
    ? await importClasses(MIGRATIONS_DIR, '.ts')
    : [];
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl(),
    entities: entities as DataSourceOptions['entities'],
    migrations: migrations as DataSourceOptions['migrations'],
    migrationsTableName: 'migrations',
  });
}

export async function resetDatabase(dataSource: DataSource): Promise<void> {
  if (!testDatabaseName().endsWith(TEST_SUFFIX)) {
    throw new Error('Refusing to truncate a database that is not a test one');
  }
  const tables = dataSource.entityMetadatas
    .map((metadata) => `"${metadata.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export function useTestDatabase(): { readonly dataSource: DataSource } {
  let current: DataSource | undefined;

  beforeAll(async () => {
    current = await createTestDataSource();
    await current.initialize();
  });

  beforeEach(async () => {
    await resetDatabase(current!);
  });

  afterAll(async () => {
    await current?.destroy();
  });

  return {
    get dataSource(): DataSource {
      return current!;
    },
  };
}
