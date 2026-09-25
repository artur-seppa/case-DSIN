import { createAuthFetch } from '@/shared/api/auth-fetch';
import { getCsrfToken } from '@/shared/api/csrf';

vi.mock('@/shared/api/csrf', () => ({
  getCsrfToken: vi.fn(),
}));

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}

describe('createAuthFetch', () => {
  beforeEach(() => {
    vi.mocked(getCsrfToken).mockResolvedValue('csrf-token-abc');
  });

  it('passes through a successful response untouched', async () => {
    const baseFetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const authFetch = createAuthFetch(baseFetch);

    const response = await authFetch('/api/services');

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes once (with the CSRF token attached) and retries on a 401 from a non-auth endpoint', async () => {
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200))
      .mockResolvedValueOnce(jsonResponse(200, { retried: true }));
    const authFetch = createAuthFetch(baseFetch);

    const response = await authFetch('/api/services');

    expect(baseFetch).toHaveBeenNthCalledWith(1, '/api/services', undefined);
    expect(baseFetch).toHaveBeenNthCalledWith(2, '/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': 'csrf-token-abc' },
    });
    expect(baseFetch).toHaveBeenNthCalledWith(3, '/api/services', undefined);
    expect(await response.json()).toEqual({ retried: true });
  });

  it('retries a request with a body after refresh without reusing an already-consumed Request object', async () => {
    let appointmentCallCount = 0;
    const baseFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (typeof input === 'string' && input === '/api/auth/refresh') {
        return jsonResponse(200);
      }
      if (input instanceof Request) {
        if (input.bodyUsed) {
          throw new TypeError('Cannot construct a Request with a Request object that has already been used.');
        }
        await input.text();
      }
      appointmentCallCount += 1;
      return appointmentCallCount === 1 ? jsonResponse(401) : jsonResponse(200, { retried: true });
    });
    const authFetch = createAuthFetch(baseFetch);
    const request = new Request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });

    const response = await authFetch(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ retried: true });
  });

  it('collapses concurrent 401s into a single refresh call', async () => {
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200))
      .mockResolvedValueOnce(jsonResponse(200))
      .mockResolvedValueOnce(jsonResponse(200));
    const authFetch = createAuthFetch(baseFetch);

    await Promise.all([authFetch('/api/a'), authFetch('/api/b')]);

    const refreshCalls = baseFetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
  });

  it('returns the original 401 without retrying when the refresh itself fails', async () => {
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(401));
    const authFetch = createAuthFetch(baseFetch);

    const response = await authFetch('/api/services');

    expect(response.status).toBe(401);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it('calls onSessionExpired when the refresh itself fails, so the app can clear the session and redirect', async () => {
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(401));
    const onSessionExpired = vi.fn();
    const authFetch = createAuthFetch(baseFetch, onSessionExpired);

    await authFetch('/api/services');

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not call onSessionExpired when the refresh succeeds', async () => {
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200))
      .mockResolvedValueOnce(jsonResponse(200));
    const onSessionExpired = vi.fn();
    const authFetch = createAuthFetch(baseFetch, onSessionExpired);

    await authFetch('/api/services');

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not try to refresh a 401 from the login endpoint itself', async () => {
    const baseFetch = vi.fn().mockResolvedValue(jsonResponse(401));
    const authFetch = createAuthFetch(baseFetch);

    const response = await authFetch('/api/auth/login', { method: 'POST' });

    expect(response.status).toBe(401);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });
});
