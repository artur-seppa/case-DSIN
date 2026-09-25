import {
  professionalsQueryOptions,
  adminProfessionalsInfiniteQueryOptions,
  createProfessional,
  setProfessionalWorkingHours,
} from '@/features/catalog/api/professionals';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn() },
}));

describe('professionalsQueryOptions', () => {
  it('requests professionals qualified for the given service', async () => {
    const professionals = [{ id: '1', name: 'Bia', active: true }];
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: professionals, total: 1, page: 1, limit: 100, totalPages: 1 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = professionalsQueryOptions('svc-1');
    const result = await options.queryFn!({} as never);

    expect(client.GET).toHaveBeenCalledWith('/api/professionals', {
      params: { query: { serviceId: 'svc-1', limit: 100 } },
    });
    expect(result).toEqual(professionals);
    expect(options.queryKey).toEqual(['catalog', 'professionals', 'svc-1']);
  });

  it('throws when the request fails', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { statusCode: 500, message: 'erro' },
      response: new Response(null, { status: 500 }),
    } as never);

    await expect(professionalsQueryOptions('svc-1').queryFn!({} as never)).rejects.toThrow(
      'PROFESSIONALS_500',
    );
  });
});

describe('adminProfessionalsInfiniteQueryOptions', () => {
  it('requests the first page including inactive professionals, with a small page size', async () => {
    const items = [{ id: '1', name: 'Bia', active: true }];
    vi.mocked(client.GET).mockResolvedValue({
      data: { items, total: 3, page: 1, limit: 5, totalPages: 1 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = adminProfessionalsInfiniteQueryOptions();
    const result = await options.queryFn!({ pageParam: 1 } as never);

    expect(client.GET).toHaveBeenCalledWith('/api/professionals', {
      params: { query: { includeInactive: true, page: 1, limit: 5 } },
    });
    expect(result).toEqual({ items, total: 3, page: 1, limit: 5, totalPages: 1 });
  });

  it('computes the next page param, and stops once the last page is reached', () => {
    const options = adminProfessionalsInfiniteQueryOptions();

    expect(
      options.getNextPageParam!({ items: [], total: 8, page: 1, limit: 5, totalPages: 2 } as never, [], 1, []),
    ).toBe(2);
    expect(
      options.getNextPageParam!({ items: [], total: 8, page: 2, limit: 5, totalPages: 2 } as never, [], 2, []),
    ).toBeUndefined();
  });
});

describe('createProfessional', () => {
  it('rejects with the real backend validation message, not a generic status code', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Nome: informe ao menos 2 caracteres'] },
      response: new Response(null, { status: 400 }),
    } as never);

    await expect(createProfessional('A')).rejects.toEqual({
      status: 400,
      code: null,
      message: 'Nome: informe ao menos 2 caracteres',
    });
  });
});

describe('setProfessionalWorkingHours', () => {
  it('rejects with the real backend validation message, not a generic status code', async () => {
    vi.mocked(client.PUT).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Horário deve estar no formato HH:MM'] },
      response: new Response(null, { status: 400 }),
    } as never);

    await expect(setProfessionalWorkingHours('p1', [{ weekday: 1, startTime: '9', endTime: '18:00' }])).rejects.toEqual({
      status: 400,
      code: null,
      message: 'Horário deve estar no formato HH:MM',
    });
  });
});
