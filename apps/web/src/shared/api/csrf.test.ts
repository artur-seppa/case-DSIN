import {
  createCsrfMiddleware,
  getCsrfToken,
  clearCsrfToken,
  __resetCsrfCacheForTests,
} from '@/shared/api/csrf';

describe('createCsrfMiddleware', () => {
  beforeEach(() => {
    __resetCsrfCacheForTests();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not fetch a token for a GET request', async () => {
    const middleware = createCsrfMiddleware();
    const request = new Request('/api/services', { method: 'GET' });

    const result = await middleware.onRequest!({ request } as never);

    expect(fetch).not.toHaveBeenCalled();
    expect((result as Request).headers.get('x-csrf-token')).toBeNull();
  });

  it('fetches and attaches a token for a POST request', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'abc123' }), { status: 200 }),
    );
    const middleware = createCsrfMiddleware();
    const request = new Request('/api/appointments', { method: 'POST' });

    const result = await middleware.onRequest!({ request } as never);

    expect(fetch).toHaveBeenCalledWith('/api/auth/csrf', { credentials: 'include' });
    expect((result as Request).headers.get('x-csrf-token')).toBe('abc123');
  });

  it('reuses the cached token across multiple mutating requests', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'abc123' }), { status: 200 }),
    );
    const middleware = createCsrfMiddleware();

    await middleware.onRequest!({ request: new Request('/api/a', { method: 'POST' }) } as never);
    await middleware.onRequest!({ request: new Request('/api/b', { method: 'POST' }) } as never);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('clears the cached token and lets a 403 CSRF_INVALID pass through', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'first' }), { status: 200 }),
    );
    const middleware = createCsrfMiddleware();
    await middleware.onRequest!({ request: new Request('/api/a', { method: 'POST' }) } as never);

    const response = new Response(JSON.stringify({ code: 'CSRF_INVALID' }), { status: 403 });
    const result = await middleware.onResponse!({ response } as never);

    expect(result).toBe(response);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'second' }), { status: 200 }),
    );
    const nextRequest = await middleware.onRequest!({
      request: new Request('/api/b', { method: 'POST' }),
    } as never);
    expect((nextRequest as Request).headers.get('x-csrf-token')).toBe('second');
  });

  it('propagates a network failure while fetching the CSRF token, instead of hanging or swallowing it', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const middleware = createCsrfMiddleware();
    const request = new Request('/api/appointments', { method: 'POST' });

    await expect(middleware.onRequest!({ request } as never)).rejects.toThrow('Failed to fetch');
  });
});

describe('getCsrfToken', () => {
  beforeEach(() => {
    __resetCsrfCacheForTests();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collapses concurrent calls into a single fetch (single-flight, not just cache-after-resolve)', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }) as never,
    );

    const first = getCsrfToken();
    const second = getCsrfToken();
    resolveFetch(new Response(JSON.stringify({ csrfToken: 'abc123' }), { status: 200 }));

    await expect(first).resolves.toBe('abc123');
    await expect(second).resolves.toBe('abc123');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches a fresh token again after clearCsrfToken', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'first' }), { status: 200 }),
    );
    await expect(getCsrfToken()).resolves.toBe('first');

    clearCsrfToken();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'second' }), { status: 200 }),
    );
    await expect(getCsrfToken()).resolves.toBe('second');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects clearly when the CSRF endpoint itself responds with an error status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    await expect(getCsrfToken()).rejects.toThrow();
  });
});
