import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesList } from '@/features/catalog/components/services-list';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

function servicesPage(items: unknown[], page = 1, totalPages = 1) {
  return {
    data: { items, total: items.length, page, limit: 5, totalPages },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
}

describe('ServicesList', () => {
  it('renders the services returned by the API', async () => {
    vi.mocked(client.GET).mockResolvedValue(
      servicesPage([{ id: 's1', name: 'Corte', durationMinutes: 60, priceCents: 8000, active: true }]) as never,
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ServicesList />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Corte')).toBeInTheDocument();
  });

  it('reflects an edited service in the list without a manual reload', async () => {
    let editApplied = false;
    vi.mocked(client.GET).mockImplementation(
      () =>
        Promise.resolve(
          servicesPage([
            { id: 's1', name: editApplied ? 'Corte renovado' : 'Corte', durationMinutes: 60, priceCents: 8000, active: true },
          ]),
        ) as never,
    );
    vi.mocked(client.PATCH).mockImplementation(() => {
      editApplied = true;
      return Promise.resolve({
        data: { id: 's1', name: 'Corte renovado', durationMinutes: 60, priceCents: 8000, active: true },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }) as never;
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ServicesList />
      </QueryClientProvider>,
    );

    await screen.findByText('Corte');
    await user.click(screen.getByRole('button', { name: 'Editar serviço' }));
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[0]!);

    expect(await screen.findByText('Corte renovado')).toBeInTheDocument();
  });

  it('shows the backend validation message inline when saving fails', async () => {
    vi.mocked(client.GET).mockResolvedValue(
      servicesPage([{ id: 's1', name: 'Corte', durationMinutes: 60, priceCents: 8000, active: true }]) as never,
    );
    vi.mocked(client.PATCH).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Duração deve ser múltipla de 15 minutos'] },
      response: new Response(null, { status: 400 }),
    } as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ServicesList />
      </QueryClientProvider>,
    );

    await screen.findByText('Corte');
    await user.click(screen.getByRole('button', { name: 'Editar serviço' }));
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[0]!);

    expect(await screen.findByText('Duração deve ser múltipla de 15 minutos')).toBeInTheDocument();
  });

  it('loads the next page of services when "Carregar mais" is clicked', async () => {
    vi.mocked(client.GET).mockImplementation((_path: string, init?: { params?: { query?: { page?: number } } }) => {
      const page = init?.params?.query?.page ?? 1;
      if (page === 1) {
        return Promise.resolve(
          servicesPage([{ id: 's1', name: 'Corte', durationMinutes: 60, priceCents: 8000, active: true }], 1, 2),
        ) as never;
      }
      return Promise.resolve(
        servicesPage([{ id: 's2', name: 'Escova', durationMinutes: 45, priceCents: 6000, active: true }], 2, 2),
      ) as never;
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ServicesList />
      </QueryClientProvider>,
    );

    await screen.findByText('Corte');
    expect(screen.queryByText('Escova')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Escova')).toBeInTheDocument();
  });
});
