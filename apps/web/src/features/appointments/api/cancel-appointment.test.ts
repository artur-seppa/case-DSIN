import { cancelAppointment } from '@/features/appointments/api/cancel-appointment';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('cancelAppointment', () => {
  it('posts the reason and resolves with the updated appointment', async () => {
    const updated = { id: 'apt-1', status: 'CANCELLED' };
    vi.mocked(client.POST).mockResolvedValue({
      data: updated,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await cancelAppointment('apt-1', 'Imprevisto');

    expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/cancel', {
      params: { path: { id: 'apt-1' } },
      body: { reason: 'Imprevisto' },
    });
    expect(result).toEqual(updated);
  });

  it('omits the reason when none is given', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: 'apt-1', status: 'CANCELLED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    await cancelAppointment('apt-1');

    expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/cancel', {
      params: { path: { id: 'apt-1' } },
      body: { reason: undefined },
    });
  });

  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.POST).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(cancelAppointment('apt-1')).rejects.toEqual({
      status: 0,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('maps a 422 CHANGE_WINDOW_EXPIRED business error', async () => {
    const body = { statusCode: 422, code: 'CHANGE_WINDOW_EXPIRED', message: 'Prazo de alteração expirado' };
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: body,
      response: new Response(JSON.stringify(body), { status: 422 }),
    } as never);

    await expect(cancelAppointment('apt-1')).rejects.toEqual({
      status: 422,
      code: 'CHANGE_WINDOW_EXPIRED',
      message: 'Prazo de alteração expirado',
    });
  });
});
