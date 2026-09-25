import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { AddItemScreen } from '@/features/appointments/components/add-item-screen';
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

function appointmentResponse(overrides: Record<string, unknown> = {}) {
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

function servicesResponse() {
  return {
    data: { items: [{ id: 'svc-a', name: 'Corte', durationMinutes: 60, priceCents: 5000, active: true }], total: 1, page: 1, limit: 100 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function professionalsResponse() {
  return {
    data: { items: [{ id: 'prof-a', name: 'Bia', active: true }], total: 1, page: 1, limit: 100 },
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

function mockGet(overrides: { appointment?: Record<string, unknown>; starts?: string[] } = {}) {
  vi.mocked(client.GET).mockImplementation((path: string) => {
    if (path === '/api/config') return Promise.resolve(configResponse()) as never;
    if (path === '/api/appointments/{id}') return Promise.resolve(appointmentResponse(overrides.appointment)) as never;
    if (path === '/api/services') return Promise.resolve(servicesResponse()) as never;
    if (path === '/api/professionals') return Promise.resolve(professionalsResponse()) as never;
    if (path === '/api/availability') return Promise.resolve(availabilityResponse(overrides.starts ?? ['2026-10-01T20:00:00Z'])) as never;
    throw new Error(`unexpected path ${path}`);
  });
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const addItemRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/appointments/$id/add-item',
    component: () => <AddItemScreen appointmentId="apt-1" />,
  });
  const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments/$id', component: () => <div>detail</div> });
  const routeTree = rootRoute.addChildren([detailRoute, addItemRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/appointments/apt-1/add-item'] }) });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AddItemScreen', () => {
  it('walks through service -> professional -> time, then adds the item', async () => {
    mockGet();
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: 'apt-1', status: 'CONFIRMED' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: /Corte/ }));
    await user.selectOptions(await screen.findByLabelText('Escolha o profissional'), 'prof-a');
    await user.click(await screen.findByRole('button', { name: '17:00' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() =>
      expect(client.POST).toHaveBeenCalledWith('/api/appointments/{id}/items', {
        params: { path: { id: 'apt-1' } },
        body: { serviceId: 'svc-a', professionalId: 'prof-a', startsAt: '2026-10-01T20:00:00Z' },
      }),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows a not-eligible message instead of the flow when canClientChange is false', async () => {
    mockGet({ appointment: { canClientChange: false } });
    renderScreen();

    expect(await screen.findByText('Não é possível alterar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Corte/ })).not.toBeInTheDocument();
  });

  it('shows a slot-taken message and clears the selection on a 409 conflict', async () => {
    mockGet();
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: { statusCode: 409, code: 'SLOT_TAKEN', message: 'Horário ocupado' },
      response: new Response(null, { status: 409 }),
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: /Corte/ }));
    await user.selectOptions(await screen.findByLabelText('Escolha o profissional'), 'prof-a');
    await user.click(await screen.findByRole('button', { name: '17:00' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Esse horário acabou de ser ocupado', expect.anything()));
  });
});
