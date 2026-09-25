import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StepReview } from '@/features/booking/components/step-review';
import { BookingWizardProvider, useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { client } from '@/shared/api/client';
import { toast } from '@/shared/lib/toast';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}));
vi.mock('@/shared/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function Seed({ children }: { children: ReactNode }) {
  const { toggleService, setProfessional, setSchedule } = useBookingWizard();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          toggleService({ id: 'svc-a', name: 'Corte', durationMinutes: 45, priceCents: 8000 });
          setProfessional('svc-a', 'prof-a', 'Bia');
          setSchedule('2026-10-01', '2026-10-01T18:00:00Z');
        }}
      >
        seed
      </button>
      {children}
    </>
  );
}

function TwoItemSeed({ children }: { children: ReactNode }) {
  const { toggleService, setProfessional, setSchedule } = useBookingWizard();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          toggleService({ id: 'svc-a', name: 'Corte', durationMinutes: 45, priceCents: 8000 });
          setProfessional('svc-a', 'prof-a', 'Bia');
          toggleService({ id: 'svc-b', name: 'Escova', durationMinutes: 30, priceCents: 5000 });
          setProfessional('svc-b', 'prof-b', 'Caio');
          setSchedule('2026-10-01', '2026-10-01T18:00:00Z');
        }}
      >
        seed-two
      </button>
      {children}
    </>
  );
}

function StepIndicator() {
  const { state } = useBookingWizard();
  return <span data-testid="step">{state.step}</span>;
}

function renderStep(onConfirmed = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(client.GET).mockResolvedValue({
    data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  } as never);
  return {
    onConfirmed,
    ...render(
      <QueryClientProvider client={queryClient}>
        <BookingWizardProvider>
          <Seed>
            <StepReview onConfirmed={onConfirmed} />
            <StepIndicator />
          </Seed>
        </BookingWizardProvider>
      </QueryClientProvider>,
    ),
  };
}

function renderTwoItemStep(onConfirmed = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(client.GET).mockResolvedValue({
    data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  } as never);
  return {
    onConfirmed,
    ...render(
      <QueryClientProvider client={queryClient}>
        <BookingWizardProvider>
          <TwoItemSeed>
            <StepReview onConfirmed={onConfirmed} />
          </TwoItemSeed>
        </BookingWizardProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('StepReview', () => {
  it('shows the summary and total, shows a success toast, and calls onConfirmed after a successful submit', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: 'apt-1', status: 'PENDING' },
      error: undefined,
      response: new Response(null, { status: 201 }),
    } as never);
    const user = userEvent.setup();
    const { onConfirmed } = renderStep();

    await user.click(screen.getByText('seed'));

    expect(await screen.findByText('Corte')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 80,00')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows the correct, non-overlapping start time for each item in a multi-service booking', async () => {
    const user = userEvent.setup();
    renderTwoItemStep();

    await user.click(screen.getByText('seed-two'));

    expect(await screen.findByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Escova')).toBeInTheDocument();
    expect(screen.getByText(/15:00.*Bia/)).toBeInTheDocument();
    expect(screen.getByText(/15:45.*Caio/)).toBeInTheDocument();
  });

  it('shows a toast and does not call onConfirmed on a 409 SLOT_TAKEN', async () => {
    const body = { statusCode: 409, code: 'SLOT_TAKEN', message: 'Horário acabou de ser ocupado' };
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: body,
      response: new Response(JSON.stringify(body), { status: 409 }),
    } as never);
    const user = userEvent.setup();
    const { onConfirmed } = renderStep();

    await user.click(screen.getByText('seed'));
    await user.click(await screen.findByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Esse horário acabou de ser ocupado', {
      description: 'Escolha outro horário disponível',
    }));
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('shows the server message for any other error instead of failing silently', async () => {
    const body = { statusCode: 422, code: 'LEAD_TIME_TOO_SHORT', message: 'Antecedência mínima não respeitada' };
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: body,
      response: new Response(JSON.stringify(body), { status: 422 }),
    } as never);
    const user = userEvent.setup();
    const { onConfirmed } = renderStep();

    await user.click(screen.getByText('seed'));
    await user.click(await screen.findByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Antecedência mínima não respeitada'));
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('limits notes to 500 characters', async () => {
    renderStep();

    expect(await screen.findByLabelText(/Observação/)).toHaveAttribute('maxLength', '500');
  });

  it('has a Voltar button that returns to step 2', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText('seed'));
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));

    expect(screen.getByTestId('step')).toHaveTextContent('2');
  });
});
