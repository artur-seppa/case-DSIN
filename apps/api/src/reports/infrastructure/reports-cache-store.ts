import { createKeyvNonBlocking } from '@keyv/redis';

const CONNECTION_TIMEOUT_MS = 1000;

export function createReportsCacheStore(redisUrl: string) {
  return createKeyvNonBlocking(redisUrl, { connectionTimeout: CONNECTION_TIMEOUT_MS });
}
