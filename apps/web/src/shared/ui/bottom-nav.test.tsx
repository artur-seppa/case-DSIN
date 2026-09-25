import { render, screen } from '@testing-library/react';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { BottomNav } from '@/shared/ui/bottom-nav';

function renderNav(initialPath: string) {
  const rootRoute = createRootRoute({ component: () => <BottomNav /> });
  const bookRoute = createRoute({ getParentRoute: () => rootRoute, path: '/book', component: () => <div>book</div> });
  const appointmentsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/appointments', component: () => <div>appointments</div> });
  const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: () => <div>profile</div> });
  const routeTree = rootRoute.addChildren([bookRoute, appointmentsRoute, profileRoute]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }) });
  return render(<RouterProvider router={router} />);
}

describe('BottomNav', () => {
  it('shows the active tab in the accent color, without the inactive color also applied', async () => {
    renderNav('/appointments');

    const activeLink = await screen.findByRole('link', { name: 'Agendamentos' });
    expect(activeLink.className).toContain('text-accent-700');
    expect(activeLink.className).not.toContain('text-text-secondary');
  });

  it('keeps inactive tabs in the secondary color', async () => {
    renderNav('/appointments');

    const inactiveLink = await screen.findByRole('link', { name: 'Agendar' });
    expect(inactiveLink.className).toContain('text-text-secondary');
    expect(inactiveLink.className).not.toContain('text-accent-700');
  });
});
