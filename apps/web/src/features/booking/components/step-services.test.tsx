import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StepServices } from '@/features/booking/components/step-services';
import { BookingWizardProvider, useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

function servicesResponse(items: unknown[]) {
  return { data: { items, total: items.length, page: 1, limit: 100, totalPages: 1 }, error: undefined, response: new Response(null, { status: 200 }) };
}

function professionalsResponse(items: unknown[]) {
  return { data: { items, total: items.length, page: 1, limit: 100, totalPages: 1 }, error: undefined, response: new Response(null, { status: 200 }) };
}

function StepIndicator() {
  const { state } = useBookingWizard();
  return <span data-testid="step">{state.step}</span>;
}

function renderStep() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BookingWizardProvider>
        <StepServices />
        <StepIndicator />
      </BookingWizardProvider>
    </QueryClientProvider>,
  );
}

describe('StepServices', () => {
  beforeEach(() => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/services') {
        return Promise.resolve(
          servicesResponse([
            { id: 'svc-corte', name: 'Corte feminino', durationMinutes: 45, priceCents: 8000, active: true },
          ]),
        ) as never;
      }
      return Promise.resolve(professionalsResponse([{ id: 'prof-bia', name: 'Bia', active: true }])) as never;
    });
  });

  it('disables continuing until a service is selected', async () => {
    renderStep();

    expect(await screen.findByText('Corte feminino')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('disables continuing when a selected service has no professional yet', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(await screen.findByText('Corte feminino'));

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('enables continuing once every selected service has a professional, and advances the wizard', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(await screen.findByText('Corte feminino'));
    await user.selectOptions(await screen.findByLabelText('Escolha o profissional'), 'prof-bia');

    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);

    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('2'));
  });
});
