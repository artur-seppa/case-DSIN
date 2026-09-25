import { cancelItem } from '@/features/queue/api/cancel-item';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('cancelItem', () => {
  it('posts the cancel with an optional reason and resolves with the updated appointment', async () => {
    const updated = { id: 'apt-1', status: 'CONFIRMED' };
    vi.mocked(client.POST).mockResolvedValue({
      data: updated,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await cancelItem('apt-1', 'item-1', 'cliente pediu');

    expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}/cancel', {
      params: { path: { id: 'apt-1', itemId: 'item-1' } },
      body: { reason: 'cliente pediu' },
    });
    expect(result).toEqual(updated);
  });
});
