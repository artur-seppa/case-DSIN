import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { AppointmentDetailScreen } from '@/features/appointments/components/appointment-detail';
import { client } from '@/shared/api/client';
import { toast } from '@/shared/lib/toast';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}));
vi.mock('@/shared/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function configResponse() {
  return {
    data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function detailResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      id: 'apt-1',
      client: { id: 'c1', name: 'Mariana', phone: null },
      status: 'CONFIRMED',
      notes: null,
      createdAt: '2026-09-20T12:00:00Z',
      startsAt: '2026-10-01T18:00:00Z',
      endsAt: '2026-10-01T19:00:00Z',
      totalCents: 8000,
      changeDeadline: '2026-09-29T18:00:00Z',
      canClientChange: true,
      items: [],
      ...overrides,
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function renderScreen(id = 'apt-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/appointments/$id',
    component: () => <AppointmentDetailScreen id={id} />,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments', component: () => <div>list</div> });
  const addItemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments/$id/add-item', component: () => <div>add-item</div> });
  const repositionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/appointments/$id/items/$itemId/reposition',
    component: () => <div>reposition</div>,
  });
  const routeTree = rootRoute.addChildren([listRoute, detailRoute, addItemRoute, repositionRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [`/appointments/${id}`] }) });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('AppointmentDetailScreen', () => {
  it('shows the items, total, and an open change-window message with the full deadline date and time', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(
        detailResponse({
          items: [
            { id: 'i1', service: { id: 's1', name: 'Corte feminino' }, professional: { id: 'p1', name: 'Bia' }, startsAt: '2026-10-01T18:00:00Z', endsAt: '2026-10-01T19:00:00Z', priceCents: 8000, status: 'CONFIRMED' },
          ],
        }),
      ) as never;
    });
    renderScreen();

    expect(await screen.findByText('Corte feminino')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 80,00')).toHaveLength(2);
    expect(screen.getByText(/Você pode alterar este agendamento até 29\/09 15:00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar agendamento' })).toBeEnabled();
  });

  it('disables cancel with an explanation naming the deadline that already passed', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(
        detailResponse({ changeDeadline: '2026-08-01T18:00:00Z', canClientChange: false }),
      ) as never;
    });
    renderScreen();

    expect(await screen.findByText(/prazo para alterar este agendamento.*01\/08 15:00.*já passou/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar agendamento' })).toBeDisabled();
  });

  it('hides the change-window banner entirely for a fully cancelled appointment', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(
        detailResponse({ status: 'CANCELLED', changeDeadline: null, canClientChange: false }),
      ) as never;
    });
    renderScreen();

    await screen.findByText('Cancelado');
    expect(screen.queryByText(/alterar este agendamento/)).not.toBeInTheDocument();
  });

  it('links "Adicionar serviço" to the add-item screen when the client can still change the appointment', async () => {
    const user = userEvent.setup();
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(detailResponse({ canClientChange: true })) as never;
    });
    const router = renderScreen();

    await user.click(await screen.findByRole('link', { name: 'Adicionar serviço' }));

    expect(router.state.location.pathname).toBe('/appointments/apt-1/add-item');
  });

  it('shows "Adicionar serviço" disabled when the client can no longer change the appointment', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(detailResponse({ canClientChange: false, changeDeadline: null, status: 'CANCELLED' })) as never;
    });
    renderScreen();

    expect(await screen.findByRole('button', { name: 'Adicionar serviço' })).toBeDisabled();
  });

  it('links each eligible item to its own reposition screen, and hides the action for ineligible items', async () => {
    const user = userEvent.setup();
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(
        detailResponse({
          items: [
            { id: 'i1', service: { id: 's1', name: 'Corte feminino' }, professional: { id: 'p1', name: 'Bia' }, startsAt: '2026-10-01T18:00:00Z', endsAt: '2026-10-01T19:00:00Z', priceCents: 8000, status: 'CONFIRMED' },
            { id: 'i2', service: { id: 's2', name: 'Manicure' }, professional: { id: 'p2', name: 'Carla' }, startsAt: '2026-10-01T19:00:00Z', endsAt: '2026-10-01T19:30:00Z', priceCents: 3000, status: 'COMPLETED' },
          ],
        }),
      ) as never;
    });
    const router = renderScreen();

    await screen.findByText('Corte feminino');
    expect(screen.getAllByRole('link', { name: 'Reposicionar' })).toHaveLength(1);

    await user.click(screen.getByRole('link', { name: 'Reposicionar' }));

    expect(router.state.location.pathname).toBe('/appointments/apt-1/items/i1/reposition');
  });

  it('shows a not-found state on a 404 instead of crashing', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve({
        data: undefined,
        error: { statusCode: 404, code: 'NOT_FOUND', message: 'Não encontrado' },
        response: new Response(null, { status: 404 }),
      }) as never;
    });
    renderScreen('missing');

    expect(await screen.findByText('Agendamento não encontrado')).toBeInTheDocument();
  });

  it('shows a distinct, retryable error state for a non-404 failure', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve({
        data: undefined,
        error: { statusCode: 500, message: 'erro' },
        response: new Response(null, { status: 500 }),
      }) as never;
    });
    renderScreen();

    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
    expect(screen.queryByText('Agendamento não encontrado')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('reveals an inline confirmation with an optional reason before cancelling, and sends the reason on confirmation', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(detailResponse()) as never;
    });
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: 'apt-1', status: 'CANCELLED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Cancelar agendamento' }));
    expect(screen.getByText('Cancelar este agendamento?')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Motivo/), 'Imprevisto');
    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));

    await waitFor(() => expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/cancel', {
      params: { path: { id: 'apt-1' } },
      body: { reason: 'Imprevisto' },
    }));
    expect(toast.success).toHaveBeenCalled();
  });

  it('cancels without a reason when none is typed', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(detailResponse()) as never;
    });
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: 'apt-1', status: 'CANCELLED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Cancelar agendamento' }));
    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }));

    await waitFor(() => expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/cancel', {
      params: { path: { id: 'apt-1' } },
      body: { reason: undefined },
    }));
  });

  it('dismisses the inline confirmation on "Não" without cancelling', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') return Promise.resolve(configResponse()) as never;
      return Promise.resolve(detailResponse()) as never;
    });
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Cancelar agendamento' }));
    await user.click(screen.getByRole('button', { name: 'Não' }));

    expect(screen.queryByText('Cancelar este agendamento?')).not.toBeInTheDocument();
    expect(client.POST).not.toHaveBeenCalled();
  });
});
