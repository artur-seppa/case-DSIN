import { join } from 'node:path';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(import.meta.dirname, '../../**/**/*.entity.js')],
  migrations: [join(import.meta.dirname, 'migrations/*.js')],
  migrationsTableName: 'migrations',
});
