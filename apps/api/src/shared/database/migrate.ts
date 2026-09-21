import { DataSource } from 'typeorm';
import { migrations } from './migrations/index.js';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url,
    migrations,
    migrationsTableName: 'migrations',
  });
  await dataSource.initialize();

  try {
    if (process.argv.includes('--revert')) {
      await dataSource.undoLastMigration({ transaction: 'each' });
      console.log('Reverted the last migration');
    } else {
      const executed = await dataSource.runMigrations({ transaction: 'each' });
      console.log(
        executed.length === 0
          ? 'Database is up to date'
          : `Applied: ${executed.map((m) => m.name).join(', ')}`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

await main();
