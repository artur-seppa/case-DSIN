import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { QueueList } from '@/features/queue/components/queue-list';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}));

function configResponse() {
  return {
    data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function appointmentsPage(items: unknown[]) {
  return {
    data: { items, total: items.length, page: 1, limit: 10, totalPages: 1 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

const APPOINTMENT = {
  id: 'apt-1',
  client: { id: 'client-1', name: 'Mariana', phone: null },
  status: 'PENDING',
  startsAt: '2026-10-01T18:00:00Z',
  endsAt: '2026-10-01T19:00:00Z',
  totalCents: 8000,
  items: [{ id: 'item-1', service: { name: 'Corte' }, professional: { name: 'Bia' }, status: 'PENDING' }],
};

function renderQueueList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const queueRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/queue', component: QueueList });
  const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/queue/$id', component: () => null });
  const routeTree = rootRoute.addChildren([queueRoute, detailRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/admin/queue'] }) });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('QueueList', () => {
  it('shows the client name for each appointment, defaulting to the Hoje tab', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(appointmentsPage([APPOINTMENT])) as never;
    });
    renderQueueList();

    expect(await screen.findByText('Mariana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('switches to the Pendentes tab and refetches with itemStatus=PENDING', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(appointmentsPage([APPOINTMENT])) as never;
    });
    const user = userEvent.setup();
    renderQueueList();

    await screen.findByText('Mariana');
    await user.click(screen.getByRole('button', { name: 'Pendentes' }));

    await waitFor(() =>
      expect(client.GET).toHaveBeenCalledWith(
        '/api/appointments',
        expect.objectContaining({
          params: expect.objectContaining({ query: expect.objectContaining({ itemStatus: ['PENDING'] }) }),
        }),
      ),
    );
  });

  it('switches to the Próximos tab and refetches without a date filter, covering confirmed/in-progress too', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(appointmentsPage([APPOINTMENT])) as never;
    });
    const user = userEvent.setup();
    renderQueueList();

    await screen.findByText('Mariana');
    await user.click(screen.getByRole('button', { name: 'Próximos' }));

    await waitFor(() =>
      expect(client.GET).toHaveBeenCalledWith('/api/appointments', {
        params: {
          query: {
            page: 1,
            limit: 10,
            itemStatus: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
            from: undefined,
            to: undefined,
            sort: 'startsAt',
            order: 'asc',
          },
        },
      }),
    );
  });
});
