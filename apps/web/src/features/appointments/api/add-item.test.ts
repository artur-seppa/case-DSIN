import { addItem } from '@/features/appointments/api/add-item';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('addItem', () => {
  it('posts the new item and resolves with the updated appointment', async () => {
    const updated = { id: 'apt-1', status: 'CONFIRMED' };
    vi.mocked(client.POST).mockResolvedValue({
      data: updated,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await addItem('apt-1', {
      serviceId: 'svc-a',
      professionalId: 'prof-a',
      startsAt: '2026-10-01T18:00:00Z',
    });

    expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/items', {
      params: { path: { id: 'apt-1' } },
      body: { serviceId: 'svc-a', professionalId: 'prof-a', startsAt: '2026-10-01T18:00:00Z' },
    });
    expect(result).toEqual(updated);
  });

  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.POST).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      addItem('apt-1', { serviceId: 'svc-a', professionalId: 'prof-a', startsAt: '2026-10-01T18:00:00Z' }),
    ).rejects.toEqual({
      status: 0,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('maps a SLOT_TAKEN business error', async () => {
    const body = { statusCode: 409, code: 'SLOT_TAKEN', message: 'Horário ocupado' };
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: body,
      response: new Response(JSON.stringify(body), { status: 409 }),
    } as never);

    await expect(
      addItem('apt-1', { serviceId: 'svc-a', professionalId: 'prof-a', startsAt: '2026-10-01T18:00:00Z' }),
    ).rejects.toEqual({
      status: 409,
      code: 'SLOT_TAKEN',
      message: 'Horário ocupado',
    });
  });
});
