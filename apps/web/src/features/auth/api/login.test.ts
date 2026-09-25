import { login } from '@/features/auth/api/login';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('login', () => {
  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.POST).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(login({ email: 'ana@example.com', password: 'x' })).rejects.toEqual({
      status: 0,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('resolves with the session on success', async () => {
    const session = { id: '1', name: 'Ana', email: 'ana@example.com', phone: null, role: 'CLIENT' as const };
    vi.mocked(client.POST).mockResolvedValue({
      data: session,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    await expect(login({ email: 'ana@example.com', password: 'x' })).resolves.toEqual(session);
  });

  it('maps invalid credentials without touching the response body a second time (matches real openapi-fetch, which already consumed it)', async () => {
    const body = { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' };
    const response = new Response(JSON.stringify(body), { status: 401 });
    await response.text();
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: body,
      response,
    } as never);

    await expect(login({ email: 'ana@example.com', password: 'wrong' })).rejects.toEqual({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha inválidos',
    });
  });
});
