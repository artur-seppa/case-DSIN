import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { RepositionItemScreen } from '@/features/appointments/components/reposition-item-screen';
import { client } from '@/shared/api/client';
import { toast } from '@/shared/lib/toast';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), PATCH: vi.fn() },
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

const ITEM = {
  id: 'item-1',
  service: { id: 'svc-a', name: 'Corte' },
  professional: { id: 'prof-a', name: 'Bia' },
  startsAt: '2026-10-01T18:00:00Z',
  endsAt: '2026-10-01T19:00:00Z',
  priceCents: 5000,
  status: 'CONFIRMED',
};

function appointmentResponse(overrides: { canClientChange?: boolean; item?: Record<string, unknown> } = {}) {
  return {
    data: {
      id: 'apt-1',
      client: { id: 'c1', name: 'Mariana', phone: null },
      status: 'CONFIRMED',
      notes: null,
      createdAt: '2026-09-20T12:00:00Z',
      startsAt: '2026-10-01T18:00:00Z',
      endsAt: '2026-10-01T19:00:00Z',
      totalCents: 5000,
      changeDeadline: '2026-09-29T18:00:00Z',
      canClientChange: overrides.canClientChange ?? true,
      items: [{ ...ITEM, ...overrides.item }],
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function professionalsResponse() {
  return {
    data: { items: [{ id: 'prof-a', name: 'Bia', active: true }, { id: 'prof-b', name: 'Carla', active: true }], total: 2, page: 1, limit: 100 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function availabilityResponse(starts: string[]) {
  return {
    data: { date: '2026-10-01', starts, sameWeekSuggestion: null },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function mockGet(overrides: { canClientChange?: boolean; item?: Record<string, unknown>; starts?: string[] } = {}) {
  vi.mocked(client.GET).mockImplementation((path: string) => {
    if (path === '/api/config') return Promise.resolve(configResponse()) as never;
    if (path === '/api/appointments/{id}')
      return Promise.resolve(appointmentResponse({ canClientChange: overrides.canClientChange, item: overrides.item })) as never;
    if (path === '/api/professionals') return Promise.resolve(professionalsResponse()) as never;
    if (path === '/api/availability') return Promise.resolve(availabilityResponse(overrides.starts ?? ['2026-10-01T20:00:00Z'])) as never;
    throw new Error(`unexpected path ${path}`);
  });
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const repositionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/appointments/$id/items/$itemId/reposition',
    component: () => <RepositionItemScreen appointmentId="apt-1" itemId="item-1" />,
  });
  const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments/$id', component: () => <div>detail</div> });
  const routeTree = rootRoute.addChildren([detailRoute, repositionRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/appointments/apt-1/items/item-1/reposition'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('RepositionItemScreen', () => {
  it('shows the current item and lets the client pick a new time, keeping the current professional by default', async () => {
    mockGet();
    vi.mocked(client.PATCH).mockResolvedValue({
      data: { id: 'apt-1', status: 'CONFIRMED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderScreen();

    expect(await screen.findByText('Corte')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '17:00' }));
    await user.click(screen.getByRole('button', { name: 'Reposicionar' }));

    await waitFor(() =>
      expect(client.PATCH).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}', {
        params: { path: { id: 'apt-1', itemId: 'item-1' } },
        body: { startsAt: '2026-10-01T20:00:00Z', professionalId: undefined },
      }),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('sends the new professionalId when the client picks a different one', async () => {
    mockGet();
    vi.mocked(client.PATCH).mockResolvedValue({
      data: { id: 'apt-1', status: 'CONFIRMED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await screen.findByRole('option', { name: 'Carla' });
    await user.selectOptions(screen.getByLabelText('Escolha o profissional'), 'prof-b');
    await user.click(await screen.findByRole('button', { name: '17:00' }));
    await user.click(screen.getByRole('button', { name: 'Reposicionar' }));

    await waitFor(() =>
      expect(client.PATCH).toHaveBeenCalledWith('/api/appointments/{id}/items/{itemId}', {
        params: { path: { id: 'apt-1', itemId: 'item-1' } },
        body: { startsAt: '2026-10-01T20:00:00Z', professionalId: 'prof-b' },
      }),
    );
  });

  it('shows a not-eligible message when canClientChange is false', async () => {
    mockGet({ canClientChange: false });
    renderScreen();

    expect(await screen.findByText('Não é possível alterar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reposicionar' })).not.toBeInTheDocument();
  });

  it('shows a not-eligible message when the item is not PENDING/CONFIRMED', async () => {
    mockGet({ item: { status: 'COMPLETED' } });
    renderScreen();

    expect(await screen.findByText('Não é possível alterar')).toBeInTheDocument();
  });
});
