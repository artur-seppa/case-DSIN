import { updateProfile } from '@/features/profile/api/update-profile';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { PATCH: vi.fn() },
}));

describe('updateProfile', () => {
  it('sends the updated name and phone, and resolves with the updated user', async () => {
    const user = { id: '1', name: 'Ana Souza', email: 'ana@example.com', phone: '+5511912345678', role: 'CLIENT' as const };
    vi.mocked(client.PATCH).mockResolvedValue({
      data: user,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await updateProfile({ name: 'Ana Souza', phone: '(11) 91234-5678' });

    expect(client.PATCH).toHaveBeenCalledWith('/api/users/me', {
      body: { name: 'Ana Souza', phone: '(11) 91234-5678' },
    });
    expect(result).toEqual(user);
  });

  it('sends null (not undefined) to clear the phone when left blank', async () => {
    vi.mocked(client.PATCH).mockResolvedValue({
      data: { id: '1', name: 'Ana', email: 'ana@example.com', phone: null, role: 'CLIENT' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    await updateProfile({ name: 'Ana', phone: '' });

    expect(client.PATCH).toHaveBeenCalledWith('/api/users/me', { body: { name: 'Ana', phone: null } });
  });

  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.PATCH).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(updateProfile({ name: 'Ana', phone: '' })).rejects.toEqual({
      status: 0,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('maps a validation error on an invalid phone', async () => {
    const body = { statusCode: 400, message: ['Número de telefone inválido'], error: 'Bad Request' };
    vi.mocked(client.PATCH).mockResolvedValue({
      data: undefined,
      error: body,
      response: new Response(JSON.stringify(body), { status: 400 }),
    } as never);

    await expect(updateProfile({ name: 'Ana', phone: '123' })).rejects.toEqual({
      status: 400,
      code: null,
      message: 'Número de telefone inválido',
    });
  });
});
