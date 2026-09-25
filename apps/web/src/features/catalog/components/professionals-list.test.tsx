import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { ProfessionalsList } from '@/features/catalog/components/professionals-list';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}));

function professionalsPage(items: unknown[], page = 1, totalPages = 1) {
  return {
    data: { items, total: items.length, page, limit: 5, totalPages },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

function renderProfessionalsList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/professionals', component: ProfessionalsList });
  const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/professionals/$id', component: () => null });
  const routeTree = rootRoute.addChildren([listRoute, detailRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/admin/professionals'] }) });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('ProfessionalsList', () => {
  it('renders the professionals returned by the API', async () => {
    vi.mocked(client.GET).mockResolvedValue(professionalsPage([{ id: 'p1', name: 'Bia', active: true }]) as never);
    renderProfessionalsList();

    expect(await screen.findByText('Bia')).toBeInTheDocument();
  });

  it('reflects a newly created professional in the list without a manual reload', async () => {
    let created = false;
    vi.mocked(client.GET).mockImplementation(
      () => Promise.resolve(professionalsPage(created ? [{ id: 'p1', name: 'Bia', active: true }, { id: 'p2', name: 'Duda', active: true }] : [{ id: 'p1', name: 'Bia', active: true }])) as never,
    );
    vi.mocked(client.POST).mockImplementation(() => {
      created = true;
      return Promise.resolve({
        data: { id: 'p2', name: 'Duda', active: true },
        error: undefined,
        response: new Response(null, { status: 201 }),
      }) as never;
    });
    const user = userEvent.setup();
    renderProfessionalsList();

    await screen.findByText('Bia');
    await user.click(screen.getByRole('button', { name: 'Novo profissional' }));
    await user.type(screen.getByLabelText('Nome'), 'Duda');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Duda')).toBeInTheDocument();
  });

  it('shows the backend validation message inline when creating fails', async () => {
    vi.mocked(client.GET).mockResolvedValue(professionalsPage([{ id: 'p1', name: 'Bia', active: true }]) as never);
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Nome deve ter ao menos 2 caracteres'] },
      response: new Response(null, { status: 400 }),
    } as never);
    const user = userEvent.setup();
    renderProfessionalsList();

    await screen.findByText('Bia');
    await user.click(screen.getByRole('button', { name: 'Novo profissional' }));
    await user.type(screen.getByLabelText('Nome'), 'D');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Nome deve ter ao menos 2 caracteres')).toBeInTheDocument();
  });

  it('loads the next page of professionals when "Carregar mais" is clicked', async () => {
    vi.mocked(client.GET).mockImplementation((_path: string, init?: { params?: { query?: { page?: number } } }) => {
      const page = init?.params?.query?.page ?? 1;
      if (page === 1) return Promise.resolve(professionalsPage([{ id: 'p1', name: 'Bia', active: true }], 1, 2)) as never;
      return Promise.resolve(professionalsPage([{ id: 'p2', name: 'Duda', active: true }], 2, 2)) as never;
    });
    const user = userEvent.setup();
    renderProfessionalsList();

    await screen.findByText('Bia');
    expect(screen.queryByText('Duda')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Duda')).toBeInTheDocument();
  });
});
