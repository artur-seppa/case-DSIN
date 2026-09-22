import { loadEnv, testDatabaseUrl } from './database.js';

loadEnv();
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
