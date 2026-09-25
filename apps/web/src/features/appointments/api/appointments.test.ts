import { appointmentsInfiniteQueryOptions } from '@/features/appointments/api/appointments';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

function pageResponse(items: unknown[], page: number, totalPages: number) {
  return {
    data: { items, total: items.length, page, limit: 10, totalPages },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

describe('appointmentsInfiniteQueryOptions', () => {
  it('requests the first page sorted by soonest first, with the given item-status filter', async () => {
    vi.mocked(client.GET).mockResolvedValue(pageResponse([{ id: 'apt-1' }], 1, 1) as never);

    const options = appointmentsInfiniteQueryOptions(['PENDING', 'CONFIRMED']);
    const result = await options.queryFn!({ pageParam: 1 } as never);

    expect(client.GET).toHaveBeenCalledWith('/api/appointments', {
      params: {
        query: { page: 1, limit: 10, itemStatus: ['PENDING', 'CONFIRMED'], sort: 'startsAt', order: 'asc' },
      },
    });
    expect(result).toEqual({ items: [{ id: 'apt-1' }], total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('requests a from/to date range when given, alongside the item-status filter', async () => {
    vi.mocked(client.GET).mockResolvedValue(pageResponse([], 1, 1) as never);

    const options = appointmentsInfiniteQueryOptions(['PENDING'], { from: '2026-10-01', to: '2026-10-01' });
    await options.queryFn!({ pageParam: 1 } as never);

    expect(client.GET).toHaveBeenCalledWith('/api/appointments', {
      params: {
        query: {
          page: 1,
          limit: 10,
          itemStatus: ['PENDING'],
          from: '2026-10-01',
          to: '2026-10-01',
          sort: 'startsAt',
          order: 'asc',
        },
      },
    });
  });

  it('computes the next page param from the response, and stops once the last page is reached', () => {
    const options = appointmentsInfiniteQueryOptions();

    expect(
      options.getNextPageParam!({ items: [], total: 25, page: 1, limit: 10, totalPages: 3 } as never, [], 1, []),
    ).toBe(2);
    expect(
      options.getNextPageParam!({ items: [], total: 25, page: 3, limit: 10, totalPages: 3 } as never, [], 3, []),
    ).toBeUndefined();
  });

  it('throws when the request fails', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { statusCode: 500, message: 'erro' },
      response: new Response(null, { status: 500 }),
    } as never);

    await expect(appointmentsInfiniteQueryOptions().queryFn!({ pageParam: 1 } as never)).rejects.toThrow(
      'APPOINTMENTS_500',
    );
  });
});
