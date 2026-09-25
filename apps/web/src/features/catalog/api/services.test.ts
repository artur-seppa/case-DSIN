import { servicesQueryOptions, adminServicesInfiniteQueryOptions, createService, updateService } from '@/features/catalog/api/services';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

describe('servicesQueryOptions', () => {
  it('requests only active services with a generous limit', async () => {
    const services = [{ id: '1', name: 'Corte feminino', durationMinutes: 45, priceCents: 8000, active: true }];
    vi.mocked(client.GET).mockResolvedValue({
      data: { items: services, total: 1, page: 1, limit: 100, totalPages: 1 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const result = await servicesQueryOptions.queryFn!({} as never);

    expect(client.GET).toHaveBeenCalledWith('/api/services', { params: { query: { limit: 100 } } });
    expect(result).toEqual(services);
  });

  it('throws when the request fails', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { statusCode: 500, message: 'erro' },
      response: new Response(null, { status: 500 }),
    } as never);

    await expect(servicesQueryOptions.queryFn!({} as never)).rejects.toThrow('SERVICES_500');
  });
});

describe('adminServicesInfiniteQueryOptions', () => {
  it('requests the first page including inactive services, with a small page size', async () => {
    const items = [{ id: '1', name: 'Corte feminino', durationMinutes: 45, priceCents: 8000, active: true }];
    vi.mocked(client.GET).mockResolvedValue({
      data: { items, total: 6, page: 1, limit: 5, totalPages: 2 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = adminServicesInfiniteQueryOptions();
    const result = await options.queryFn!({ pageParam: 1 } as never);

    expect(client.GET).toHaveBeenCalledWith('/api/services', {
      params: { query: { includeInactive: true, page: 1, limit: 5 } },
    });
    expect(result).toEqual({ items, total: 6, page: 1, limit: 5, totalPages: 2 });
  });

  it('computes the next page param, and stops once the last page is reached', () => {
    const options = adminServicesInfiniteQueryOptions();

    expect(
      options.getNextPageParam!({ items: [], total: 6, page: 1, limit: 5, totalPages: 2 } as never, [], 1, []),
    ).toBe(2);
    expect(
      options.getNextPageParam!({ items: [], total: 6, page: 2, limit: 5, totalPages: 2 } as never, [], 2, []),
    ).toBeUndefined();
  });
});

describe('updateService', () => {
  it('rejects with the real backend validation message, not a generic status code', async () => {
    vi.mocked(client.PATCH).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Duração deve ser múltipla de 15 minutos'] },
      response: new Response(null, { status: 400 }),
    } as never);

    await expect(updateService('s1', { durationMinutes: 50 })).rejects.toEqual({
      status: 400,
      code: null,
      message: 'Duração deve ser múltipla de 15 minutos',
    });
  });
});

describe('createService', () => {
  it('rejects with the real backend validation message, not a generic status code', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Nome: informe ao menos 2 caracteres'] },
      response: new Response(null, { status: 400 }),
    } as never);

    await expect(createService({ name: 'A', durationMinutes: 60, priceCents: 1000 })).rejects.toEqual({
      status: 400,
      code: null,
      message: 'Nome: informe ao menos 2 caracteres',
    });
  });
});
