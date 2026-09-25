import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { ProfessionalDetailScreen } from '@/features/catalog/components/professional-detail';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), PATCH: vi.fn(), PUT: vi.fn() },
}));

function detailResponse(overrides: Partial<{ name: string; active: boolean; serviceIds: string[]; workingHours: unknown[] }> = {}) {
  return {
    data: {
      id: 'p1',
      name: overrides.name ?? 'Bia',
      active: overrides.active ?? true,
      serviceIds: overrides.serviceIds ?? ['s1'],
      workingHours: overrides.workingHours ?? [],
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function servicesResponse() {
  return {
    data: { items: [{ id: 's1', name: 'Corte', durationMinutes: 60, priceCents: 8000, active: true }], total: 1, page: 1, limit: 100, totalPages: 1 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function renderDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/professionals', component: () => null });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/professionals/$id',
    component: () => <ProfessionalDetailScreen id="p1" />,
  });
  const routeTree = rootRoute.addChildren([listRoute, detailRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/admin/professionals/p1'] }) });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('ProfessionalDetailScreen', () => {
  it('renders the professional name and their services checklist', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/professionals/{id}') return Promise.resolve(detailResponse()) as never;
      return Promise.resolve(servicesResponse()) as never;
    });
    renderDetail();

    expect(await screen.findByDisplayValue('Bia')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
  });

  it('shows the backend validation message inline when saving the working hours fails', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/professionals/{id}') return Promise.resolve(detailResponse()) as never;
      return Promise.resolve(servicesResponse()) as never;
    });
    vi.mocked(client.PUT).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Horário deve estar no formato HH:MM'] },
      response: new Response(null, { status: 400 }),
    } as never);
    const user = userEvent.setup();
    renderDetail();

    await screen.findByDisplayValue('Bia');
    await user.click(screen.getAllByRole('button', { name: 'Adicionar faixa' })[0]!);
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[2]!);

    expect(await screen.findByText('Horário deve estar no formato HH:MM')).toBeInTheDocument();
  });

  it('groups working hours by weekday instead of a flat list with a repeated dropdown', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/professionals/{id}') {
        return Promise.resolve(
          detailResponse({ workingHours: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }] }),
        ) as never;
      }
      return Promise.resolve(servicesResponse()) as never;
    });
    renderDetail();

    await screen.findByDisplayValue('Bia');

    expect(screen.getByText('Segunda')).toBeInTheDocument();
    expect(screen.getByText('Domingo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12:00')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('toggles a service as a clickable chip instead of a checkbox', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/professionals/{id}') return Promise.resolve(detailResponse({ serviceIds: ['s1'] })) as never;
      return Promise.resolve(servicesResponse()) as never;
    });
    vi.mocked(client.PUT).mockResolvedValue({
      data: { id: 'p1', name: 'Bia', active: true, serviceIds: [], workingHours: [] },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderDetail();

    await screen.findByDisplayValue('Bia');
    const chip = screen.getByRole('button', { name: 'Corte' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[1]!);

    await waitFor(() =>
      expect(client.PUT).toHaveBeenCalledWith('/api/professionals/{id}/services', {
        params: { path: { id: 'p1' } },
        body: { serviceIds: [] },
      }),
    );
  });

  it('reflects a saved name change without a manual reload', async () => {
    let renamed = false;
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/professionals/{id}') return Promise.resolve(detailResponse({ name: renamed ? 'Bia Souza' : 'Bia' })) as never;
      return Promise.resolve(servicesResponse()) as never;
    });
    vi.mocked(client.PATCH).mockImplementation(() => {
      renamed = true;
      return Promise.resolve({
        data: { id: 'p1', name: 'Bia Souza', active: true },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }) as never;
    });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByDisplayValue('Bia');
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[0]!);

    await waitFor(async () => {
      expect(await screen.findByDisplayValue('Bia Souza')).toBeInTheDocument();
    });
  });
});
