import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { BookingWizardProvider, useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { BookingWizard } from '@/features/booking/components/booking-wizard';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}));

function Seed() {
  const { toggleService, setProfessional, setSchedule, goToStep } = useBookingWizard();
  return (
    <button
      type="button"
      onClick={() => {
        toggleService({ id: 'svc-a', name: 'Corte', durationMinutes: 45, priceCents: 8000 });
        setProfessional('svc-a', 'prof-a', 'Bia');
        setSchedule('2026-10-01', '2026-10-01T18:00:00Z');
        goToStep(2);
        goToStep(3);
      }}
    >
      seed
    </button>
  );
}

async function renderRouted() {
  vi.mocked(client.GET).mockImplementation((path: string) => {
    if (path === '/api/config') {
      return Promise.resolve({
        data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }) as never;
    }
    return Promise.resolve({
      data: { items: [], total: 0, page: 1, limit: 100, totalPages: 0 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    }) as never;
  });
  vi.mocked(client.POST).mockResolvedValue({
    data: { id: 'apt-1', status: 'PENDING' },
    error: undefined,
    response: new Response(null, { status: 201 }),
  } as never);

  const rootRoute = createRootRoute({
    component: () => (
      <BookingWizardProvider>
        <Seed />
        <BookingWizard />
      </BookingWizardProvider>
    ),
  });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <div>home</div> });
  const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: () => <div>login</div> });
  const appointmentsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments', component: () => <div>appointments</div> });
  const routeTree = rootRoute.addChildren([indexRoute, loginRoute, appointmentsRoute]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

describe('BookingWizard', () => {
  it('resets the wizard state and navigates to the appointments list after a successful confirmation', async () => {
    const user = userEvent.setup();
    const router = await renderRouted();

    await user.click(await screen.findByText('seed'));
    await user.click(await screen.findByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/appointments'));
  });

  it('lets a CLIENT log out from the wizard', async () => {
    const user = userEvent.setup();
    const router = await renderRouted();

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(client.POST).toHaveBeenCalledWith('/api/auth/logout');
  });

  it('links to the appointments list from the wizard header', async () => {
    const user = userEvent.setup();
    const router = await renderRouted();

    await user.click(await screen.findByRole('link', { name: 'Meus agendamentos' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/appointments'));
  });
});
