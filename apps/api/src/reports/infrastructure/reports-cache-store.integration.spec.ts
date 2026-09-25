import { createCache } from 'cache-manager';
import { createReportsCacheStore } from './reports-cache-store.js';

describe('createReportsCacheStore', () => {
  it('does not hang forever when Redis is unreachable — resolves quickly instead', async () => {
    const cache = createCache({ stores: [createReportsCacheStore('redis://localhost:6399')] });

    const start = Date.now();
    const result = await Promise.race([
      cache.get('any-key'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMED_OUT')), 3000)),
    ]);
    const elapsedMs = Date.now() - start;

    expect(result).toBeUndefined();
    expect(elapsedMs).toBeLessThan(3000);
  }, 5000);
});
