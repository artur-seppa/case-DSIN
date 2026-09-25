import { weeklyReportQueryOptions } from '@/features/reports/api/weekly-report';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

const REPORT = {
  weekStart: '2026-09-28',
  weekEnd: '2026-10-04',
  current: { revenueCents: 10000, completedCount: 4, createdCount: 5, cancellationRate: 0.1, noShowRate: 0.1 },
  previous: { revenueCents: 8000, completedCount: 3, createdCount: 4, cancellationRate: 0.25, noShowRate: 0 },
  serviceRanking: [{ serviceId: 'S1', name: 'Corte', completedCount: 3 }],
  professionalOccupancy: [{ professionalId: 'P1', name: 'Bia', scheduledMinutes: 60, workingMinutes: 480, occupancyRate: 0.125 }],
  revenueByWeekday: [{ weekday: 1, revenueCents: 0 }],
};

describe('weeklyReportQueryOptions', () => {
  it('requests the report for the given weekStart', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: REPORT,
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);

    const options = weeklyReportQueryOptions('2026-09-28');
    const result = await options.queryFn!({} as never);

    expect(client.GET).toHaveBeenCalledWith('/api/reports/weekly', {
      params: { query: { weekStart: '2026-09-28' } },
    });
    expect(result).toEqual(REPORT);
    expect(options.queryKey).toEqual(['reports', 'weekly', '2026-09-28']);
  });

  it('throws when the request fails', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { statusCode: 500, message: 'erro' },
      response: new Response(null, { status: 500 }),
    } as never);

    await expect(weeklyReportQueryOptions('2026-09-28').queryFn!({} as never)).rejects.toThrow('WEEKLY_REPORT_500');
  });
});
