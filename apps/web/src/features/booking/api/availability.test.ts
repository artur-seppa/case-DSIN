import { availabilityQueryOptions } from '@/features/booking/api/availability';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

describe('availabilityQueryOptions', () => {
  it('serializes the items as a comma-joined serviceId:professionalId string', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { date: '2026-10-01', starts: ['2026-10-01T18:00:00Z'], sameWeekSuggestion: null },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = availabilityQueryOptions('2026-10-01', [
      { serviceId: 'svc-a', professionalId: 'prof-a' },
      { serviceId: 'svc-b', professionalId: 'prof-b' },
    ]);
    const result = await options.queryFn!({} as never);

    expect(client.GET).toHaveBeenCalledWith('/api/availability', {
      params: { query: { date: '2026-10-01', items: 'svc-a:prof-a,svc-b:prof-b' } },
    });
    expect(result).toEqual({ date: '2026-10-01', starts: ['2026-10-01T18:00:00Z'], sameWeekSuggestion: null });
  });

  it('passes appointmentId and excludeItemId through when given, for adding/repositioning an item', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { date: '2026-10-01', starts: [], sameWeekSuggestion: null },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = availabilityQueryOptions(
      '2026-10-01',
      [{ serviceId: 'svc-a', professionalId: 'prof-a' }],
      { appointmentId: 'apt-1', excludeItemId: 'item-1' },
    );
    await options.queryFn!({} as never);

    expect(client.GET).toHaveBeenCalledWith('/api/availability', {
      params: {
        query: { date: '2026-10-01', items: 'svc-a:prof-a', appointmentId: 'apt-1', excludeItemId: 'item-1' },
      },
    });
  });

  it('throws when the request fails', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { statusCode: 422, code: 'OUTSIDE_WORKING_HOURS', message: 'erro' },
      response: new Response(null, { status: 422 }),
    } as never);

    const options = availabilityQueryOptions('2026-10-01', [{ serviceId: 'svc-a', professionalId: 'prof-a' }]);

    await expect(options.queryFn!({} as never)).rejects.toThrow('AVAILABILITY_422');
  });
});
