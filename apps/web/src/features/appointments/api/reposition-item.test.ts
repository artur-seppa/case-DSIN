import { repositionItem } from '@/features/appointments/api/reposition-item';
import { client } from '@/shared/api/client';
import { NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

vi.mock('@/shared/api/client', () => ({
  client: { PATCH: vi.fn() },
}));

describe('repositionItem', () => {
  it('patches the item with the new time and professional, resolving with the updated appointment', async () => {
    const updated = { id: 'apt-1', status: 'CONFIRMED' };
    vi.mocked(client.PATCH).mockResolvedValue({
      data: updated,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await repositionItem('apt-1', 'item-1', {
      startsAt: '2026-10-01T18:00:00Z',
      professionalId: 'prof-b',
    });

    expect(client.PATCH).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}', {
      params: { path: { id: 'apt-1', itemId: 'item-1' } },
      body: { startsAt: '2026-10-01T18:00:00Z', professionalId: 'prof-b' },
    });
    expect(result).toEqual(updated);
  });

  it('omits professionalId when keeping the current professional', async () => {
    vi.mocked(client.PATCH).mockResolvedValue({
      data: { id: 'apt-1', status: 'CONFIRMED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    await repositionItem('apt-1', 'item-1', { startsAt: '2026-10-01T18:00:00Z' });

    expect(client.PATCH).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}', {
      params: { path: { id: 'apt-1', itemId: 'item-1' } },
      body: { startsAt: '2026-10-01T18:00:00Z', professionalId: undefined },
    });
  });

  it('throws a network-failure ApiError when the request itself rejects', async () => {
    vi.mocked(client.PATCH).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      repositionItem('apt-1', 'item-1', { startsAt: '2026-10-01T18:00:00Z' }),
    ).rejects.toEqual({
      status: 0,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('maps a SLOT_TAKEN business error', async () => {
    const body = { statusCode: 409, code: 'SLOT_TAKEN', message: 'Horário ocupado' };
    vi.mocked(client.PATCH).mockResolvedValue({
      data: undefined,
      error: body,
      response: new Response(JSON.stringify(body), { status: 409 }),
    } as never);

    await expect(
      repositionItem('apt-1', 'item-1', { startsAt: '2026-10-01T18:00:00Z' }),
    ).rejects.toEqual({
      status: 409,
      code: 'SLOT_TAKEN',
      message: 'Horário ocupado',
    });
  });
});
