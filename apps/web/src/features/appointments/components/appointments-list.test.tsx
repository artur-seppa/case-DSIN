import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { AppointmentsList } from '@/features/appointments/components/appointments-list';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

function pageResponse(items: unknown[], page: number, totalPages: number) {
  return {
    data: { items, total: items.length * totalPages, page, limit: 10, totalPages },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function configResponse() {
  return {
    data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const appointmentsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments', component: AppointmentsList });
  const appointmentDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/appointments/$id',
    component: () => <div>detail</div>,
  });
  const routeTree = rootRoute.addChildren([appointmentsRoute, appointmentDetailRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/appointments'] }) });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const APPOINTMENT_A = {
  id: 'apt-a',
  status: 'CONFIRMED',
  startsAt: '2026-10-01T18:00:00Z',
  endsAt: '2026-10-01T19:00:00Z',
  totalCents: 8000,
  items: [{ id: 'item-a', service: { name: 'Corte feminino' }, professional: { name: 'Bia' }, status: 'CONFIRMED' }],
};

describe('AppointmentsList', () => {
  it('shows appointments for the default "upcoming" filter', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(pageResponse([APPOINTMENT_A], 1, 1)) as never;
    });
    renderList();

    expect(await screen.findByText('Corte feminino')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('shows a "Carregar mais" button only when there is a next page, and loads it on click', async () => {
    vi.mocked(client.GET).mockImplementation((path: string, init?: { params?: { query?: { page?: number } } }) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      const page = init?.params?.query?.page ?? 1;
      if (page === 1) {
        return Promise.resolve(
          pageResponse([{ ...APPOINTMENT_A, id: 'apt-a' }], 1, 2),
        ) as never;
      }
      return Promise.resolve(
        pageResponse([{ ...APPOINTMENT_A, id: 'apt-b', items: [{ ...APPOINTMENT_A.items[0], id: 'item-b' }] }], 2, 2),
      ) as never;
    });
    const user = userEvent.setup();
    renderList();

    await screen.findByText('Corte feminino');
    const loadMore = screen.getByRole('button', { name: 'Carregar mais' });
    expect(loadMore).toBeInTheDocument();

    await user.click(loadMore);

    await waitFor(() => expect(screen.getAllByText('Corte feminino')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('switches filters when a tab is clicked', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(pageResponse([], 1, 1)) as never;
    });
    const user = userEvent.setup();
    renderList();

    await screen.findByText('Nenhum agendamento por aqui ainda');
    await user.click(screen.getByRole('button', { name: 'Cancelados' }));

    await waitFor(() =>
      expect(client.GET).toHaveBeenCalledWith('/api/appointments', {
        params: { query: { page: 1, limit: 10, itemStatus: ['CANCELLED'], sort: 'startsAt', order: 'asc' } },
      }),
    );
  });

  it('shows a distinct, retryable error state instead of the empty state on a failed request', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve({
        data: undefined,
        error: { statusCode: 500, message: 'erro' },
        response: new Response(null, { status: 500 }),
      }) as never;
    });
    renderList();

    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum agendamento por aqui ainda')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
