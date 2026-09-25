import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { QueueDetail } from '@/features/queue/components/queue-detail';
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

function detailResponse(overrides: Partial<{ status: string; items: unknown[] }> = {}) {
  return {
    data: {
      id: 'apt-1',
      client: { id: 'client-1', name: 'Mariana', phone: '11999990000' },
      status: overrides.status ?? 'CONFIRMED',
      notes: null,
      createdAt: '2026-09-20T12:00:00Z',
      startsAt: '2026-10-01T18:00:00Z',
      endsAt: '2026-10-01T19:00:00Z',
      totalCents: 8000,
      changeDeadline: null,
      canClientChange: false,
      items: overrides.items ?? [
        {
          id: 'item-1',
          service: { id: 'svc-1', name: 'Corte' },
          professional: { id: 'prof-1', name: 'Bia' },
          startsAt: '2026-10-01T18:00:00Z',
          endsAt: '2026-10-01T19:00:00Z',
          priceCents: 8000,
          status: 'CONFIRMED',
        },
      ],
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function historyResponse() {
  return { data: [], error: undefined, response: new Response(null, { status: 200 }) };
}

function renderQueueDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/queue/$id',
    component: () => <QueueDetail id="apt-1" />,
  });
  const queueRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/queue', component: () => null });
  const routeTree = rootRoute.addChildren([queueRoute, detailRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/admin/queue/apt-1'] }) });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('QueueDetail', () => {
  it('shows the client name and lets the admin advance a confirmed item to in-progress', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      if (path === '/api/appointments/{id}/history') return Promise.resolve(historyResponse()) as never;
      return Promise.resolve(detailResponse()) as never;
    });
    vi.mocked(client.POST).mockResolvedValue(detailResponse({ items: [{ id: 'item-1', service: { id: 'svc-1', name: 'Corte' }, professional: { id: 'prof-1', name: 'Bia' }, startsAt: '2026-10-01T18:00:00Z', endsAt: '2026-10-01T19:00:00Z', priceCents: 8000, status: 'IN_PROGRESS' }] }) as never);
    const user = userEvent.setup();
    renderQueueDetail();

    expect(await screen.findByText('Mariana')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    await waitFor(() =>
      expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}/{status}', {
        params: { path: { id: 'apt-1', itemId: 'item-1', status: 'in-progress' } },
      }),
    );
  });

  it('shows an appointment-level confirm button when an item is pending', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      if (path === '/api/appointments/{id}/history') return Promise.resolve(historyResponse()) as never;
      return Promise.resolve(
        detailResponse({
          status: 'PENDING',
          items: [{ id: 'item-1', service: { id: 'svc-1', name: 'Corte' }, professional: { id: 'prof-1', name: 'Bia' }, startsAt: '2026-10-01T18:00:00Z', endsAt: '2026-10-01T19:00:00Z', priceCents: 8000, status: 'PENDING' }],
        }),
      ) as never;
    });
    renderQueueDetail();

    expect(await screen.findByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });
});
