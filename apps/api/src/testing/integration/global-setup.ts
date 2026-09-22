import { DataSource } from 'typeorm';
import {
  createTestDataSource,
  loadEnv,
  maintenanceDatabaseUrl,
  testDatabaseName,
} from './database.js';

export default async function setup(): Promise<void> {
  loadEnv();

  const maintenance = new DataSource({
    type: 'postgres',
    url: maintenanceDatabaseUrl(),
  });
  await maintenance.initialize();
  try {
    const existing = await maintenance.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDatabaseName()],
    );
    if (existing.length === 0) {
      await maintenance.query(`CREATE DATABASE "${testDatabaseName()}"`);
    }
  } finally {
    await maintenance.destroy();
  }

  const dataSource = await createTestDataSource(true);
  await dataSource.initialize();
  try {
    await dataSource.query('DROP SCHEMA public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.runMigrations({ transaction: 'each' });
  } finally {
    await dataSource.destroy();
  }
}
