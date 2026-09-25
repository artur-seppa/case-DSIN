import { confirmAppointment } from '@/features/queue/api/confirm-appointment';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('confirmAppointment', () => {
  it('posts the confirmation and resolves with the updated appointment', async () => {
    const updated = { id: 'apt-1', status: 'CONFIRMED' };
    vi.mocked(client.POST).mockResolvedValue({
      data: updated,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await confirmAppointment('apt-1');

    expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/confirm', {
      params: { path: { id: 'apt-1' } },
    });
    expect(result).toEqual(updated);
  });

  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.POST).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(confirmAppointment('apt-1')).rejects.toEqual({
      status: 0,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });
});
