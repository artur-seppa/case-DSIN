import { changeItemStatus } from '@/features/queue/api/change-item-status';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

describe('changeItemStatus', () => {
  it('posts the target status and resolves with the updated appointment', async () => {
    const updated = { id: 'apt-1', status: 'IN_PROGRESS' };
    vi.mocked(client.POST).mockResolvedValue({
      data: updated,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await changeItemStatus('apt-1', 'item-1', 'in-progress');

    expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}/{status}', {
      params: { path: { id: 'apt-1', itemId: 'item-1', status: 'in-progress' } },
    });
    expect(result).toEqual(updated);
  });
});
