import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WeeklyDashboard } from '@/features/reports/components/weekly-dashboard';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

function configResponse() {
  return {
    data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function reportResponse(weekStart: string) {
  return {
    data: {
      weekStart,
      weekEnd: weekStart,
      current: { revenueCents: 10000, completedCount: 4, createdCount: 5, cancellationRate: 0.1, noShowRate: 0.1 },
      previous: { revenueCents: 8000, completedCount: 3, createdCount: 4, cancellationRate: 0.25, noShowRate: 0 },
      serviceRanking: [{ serviceId: 'S1', name: 'Corte', completedCount: 3 }],
      professionalOccupancy: [
        { professionalId: 'P1', name: 'Bia', scheduledMinutes: 240, workingMinutes: 480, occupancyRate: 0.5 },
      ],
      revenueByWeekday: Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, revenueCents: 0 })),
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WeeklyDashboard />
    </QueryClientProvider>,
  );
}

describe('WeeklyDashboard', () => {
  it('shows the indicators, ranking and occupancy for the initial week', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(reportResponse('2026-09-28')) as never;
    });
    renderDashboard();

    expect(await screen.findByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
  });

  it('refetches with the next week when the next-week arrow is clicked', async () => {
    vi.mocked(client.GET).mockImplementation((path: string, init?: { params?: { query?: { weekStart?: string } } }) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      const weekStart = init?.params?.query?.weekStart ?? '2026-09-28';
      return Promise.resolve(reportResponse(weekStart)) as never;
    });
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('R$ 100,00');
    await user.click(screen.getByRole('button', { name: 'Próxima semana' }));

    await waitFor(() =>
      expect(client.GET).toHaveBeenCalledWith('/api/reports/weekly', {
        params: { query: { weekStart: expect.not.stringMatching('2026-09-28') } },
      }),
    );
  });

  it('keeps the header and navigation visible while the next week is loading', async () => {
    let resolveNextWeek!: (value: ReturnType<typeof reportResponse>) => void;
    const nextWeekPromise = new Promise<ReturnType<typeof reportResponse>>((resolve) => {
      resolveNextWeek = resolve;
    });
    let reportCalls = 0;
    vi.mocked(client.GET).mockImplementation((path: string, init?: { params?: { query?: { weekStart?: string } } }) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      reportCalls += 1;
      const weekStart = init?.params?.query?.weekStart ?? '2026-09-28';
      if (reportCalls === 1) return Promise.resolve(reportResponse(weekStart)) as never;
      return nextWeekPromise as never;
    });
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('R$ 100,00');
    await user.click(screen.getByRole('button', { name: 'Próxima semana' }));

    expect(screen.getByRole('button', { name: 'Próxima semana' })).toBeInTheDocument();
    expect(screen.getByText('Painel')).toBeInTheDocument();

    resolveNextWeek(reportResponse('2026-10-05'));
    await waitFor(() => expect(reportCalls).toBe(2));
  });

  it('shows a retryable error state when the report fails to load', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve({
        data: undefined,
        error: { statusCode: 500, message: 'erro' },
        response: new Response(null, { status: 500 }),
      }) as never;
    });
    renderDashboard();

    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
