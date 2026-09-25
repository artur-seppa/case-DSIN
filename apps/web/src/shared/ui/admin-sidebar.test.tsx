import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { AdminSidebar } from '@/shared/ui/admin-sidebar';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn() },
}));

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const adminRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin',
    component: () => (
      <>
        <AdminSidebar />
        <div>painel</div>
      </>
    ),
  });
  const queueRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/queue', component: () => <div>fila</div> });
  const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: () => <div>login</div> });
  const routeTree = rootRoute.addChildren([adminRoute, queueRoute, loginRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/admin'] }) });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AdminSidebar', () => {
  it('shows the brand name', async () => {
    renderSidebar();

    expect(await screen.findByText('Cabeleleila')).toBeInTheDocument();
  });

  it('links to the dashboard', async () => {
    renderSidebar();

    expect(await screen.findByRole('link', { name: /Painel/ })).toHaveAttribute('href', '/admin');
  });

  it('links to the queue', async () => {
    renderSidebar();

    expect(await screen.findByRole('link', { name: /Fila/ })).toHaveAttribute('href', '/admin/queue');
  });

  it('logs out and navigates to /login', async () => {
    vi.mocked(client.POST).mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderSidebar();

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(client.POST).toHaveBeenCalledWith('/api/auth/logout');
    expect(await screen.findByText('login')).toBeInTheDocument();
  });
});
