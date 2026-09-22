import { runInNewContext } from 'node:vm';
import { attachCsrfToken } from './swagger-csrf.js';

interface DocsRequest {
  method: string;
  headers: Record<string, string>;
}

function stubTokenEndpoint(token = 'token-from-server') {
  const fetchStub = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ csrfToken: token }),
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('attachCsrfToken (Swagger request interceptor)', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])(
    'does not fetch a token for the safe method %s',
    async (method) => {
      const fetchStub = stubTokenEndpoint();
      const request: DocsRequest = { method, headers: {} };

      const result = (await attachCsrfToken(request)) as DocsRequest;

      expect(fetchStub).not.toHaveBeenCalled();
      expect(result.headers).toEqual({});
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'fetches a token and sets x-csrf-token for %s',
    async (method) => {
      const fetchStub = stubTokenEndpoint('abc123');
      const request: DocsRequest = { method, headers: {} };

      const result = (await attachCsrfToken(request)) as DocsRequest;

      expect(fetchStub).toHaveBeenCalledWith('/api/auth/csrf', {
        credentials: 'same-origin',
      });
      expect(result.headers['x-csrf-token']).toBe('abc123');
    },
  );

  it('keeps a token the user already provided through Authorize', async () => {
    const fetchStub = stubTokenEndpoint();
    const request: DocsRequest = {
      method: 'POST',
      headers: { 'x-csrf-token': 'manual' },
    };

    const result = (await attachCsrfToken(request)) as DocsRequest;

    expect(fetchStub).not.toHaveBeenCalled();
    expect(result.headers['x-csrf-token']).toBe('manual');
  });

  it('is self-contained, because Nest ships it to the browser as source text', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'isolated' }),
    });
    const isolated = runInNewContext(`(${attachCsrfToken.toString()})`, {
      fetch: fetchStub,
    }) as typeof attachCsrfToken;
    const request: DocsRequest = { method: 'POST', headers: {} };

    const result = (await isolated(request)) as DocsRequest;

    expect(result.headers['x-csrf-token']).toBe('isolated');
  });
});
