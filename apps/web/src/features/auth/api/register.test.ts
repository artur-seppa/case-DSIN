import { register } from '@/features/auth/api/register';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('register', () => {
  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.POST).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      register({ name: 'Ana', email: 'ana@example.com', phone: undefined, password: 'password123' }),
    ).rejects.toEqual({ status: 0, code: null, message: NETWORK_ERROR_MESSAGE });
  });

  it('resolves with the session on success', async () => {
    const session = { id: '1', name: 'Ana', email: 'ana@example.com', phone: null, role: 'CLIENT' as const };
    vi.mocked(client.POST).mockResolvedValue({
      data: session,
      error: undefined,
      response: new Response(null, { status: 201 }),
    } as never);

    await expect(
      register({ name: 'Ana', email: 'ana@example.com', phone: undefined, password: 'password123' }),
    ).resolves.toEqual(session);
  });

  it('maps a duplicate e-mail business error without touching the response body a second time', async () => {
    const body = { statusCode: 409, code: 'EMAIL_ALREADY_REGISTERED', message: 'Este e-mail já está cadastrado' };
    const response = new Response(JSON.stringify(body), { status: 409 });
    await response.text();
    vi.mocked(client.POST).mockResolvedValue({ data: undefined, error: body, response } as never);

    await expect(
      register({ name: 'Ana', email: 'ana@example.com', phone: undefined, password: 'password123' }),
    ).rejects.toEqual({ status: 409, code: 'EMAIL_ALREADY_REGISTERED', message: 'Este e-mail já está cadastrado' });
  });
});
