import { useEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StepSchedule } from '@/features/booking/components/step-schedule';
import { BookingWizardProvider, useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { client } from '@/shared/api/client';
import { toDateParam } from '@/shared/utils/date';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn() },
}));

function SeedItem() {
  const { toggleService, setProfessional } = useBookingWizard();
  return (
    <button
      type="button"
      onClick={() => {
        toggleService({ id: 'svc-a', name: 'Corte', durationMinutes: 45, priceCents: 8000 });
        setProfessional('svc-a', 'prof-a', 'Bia');
      }}
    >
      seed
    </button>
  );
}

const PRECHOSEN_DATE = toDateParam(
  new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2),
);

function PreSeededSchedule() {
  const { toggleService, setProfessional, setSchedule } = useBookingWizard();
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    toggleService({ id: 'svc-a', name: 'Corte', durationMinutes: 45, priceCents: 8000 });
    setProfessional('svc-a', 'prof-a', 'Bia');
    setSchedule(PRECHOSEN_DATE, `${PRECHOSEN_DATE}T18:00:00Z`);
    setSeeded(true);
  }, []);

  if (!seeded) {
    return null;
  }
  return <StepSchedule />;
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
        <SeedItem />
        <StepSchedule />
        <StepIndicator />
      </BookingWizardProvider>
    </QueryClientProvider>,
  );
}

function renderStepWithDateSeed() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BookingWizardProvider>
        <PreSeededSchedule />
      </BookingWizardProvider>
    </QueryClientProvider>,
  );
}

describe('StepSchedule', () => {
  beforeEach(() => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') {
        return Promise.resolve({
          data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
          error: undefined,
          response: new Response(null, { status: 200 }),
        }) as never;
      }
      return Promise.resolve({
        data: { date: '2026-10-01', starts: ['2026-10-01T18:00:00Z', '2026-10-01T18:30:00Z'], sameWeekSuggestion: null },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }) as never;
    });
  });

  it('disables continuing until a slot is chosen, then advances on selection and continue', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText('seed'));

    expect(await screen.findByText('15:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    await user.click(screen.getByText('15:00'));
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);

    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('3'));
  });

  it('has a Voltar button that returns to step 1', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText('seed'));
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));

    expect(screen.getByTestId('step')).toHaveTextContent('1');
  });

  it('shows the same-week suggestion as informational, not blocking, and without claiming a false time', async () => {
    vi.mocked(client.GET).mockImplementation((path: string) => {
      if (path === '/api/config') {
        return Promise.resolve({
          data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
          error: undefined,
          response: new Response(null, { status: 200 }),
        }) as never;
      }
      return Promise.resolve({
        data: {
          date: '2026-10-01',
          starts: ['2026-10-01T18:00:00Z'],
          sameWeekSuggestion: { date: '2026-10-03', starts: ['2026-10-03T17:00:00Z'] },
        },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }) as never;
    });
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText('seed'));

    expect(await screen.findByText(/já tem um agendamento essa semana/)).toBeInTheDocument();
    expect(screen.queryByText(/às 14:00/)).not.toBeInTheDocument();
    await user.click(await screen.findByText('15:00'));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('switches to the suggested date when "Usar esta data" is clicked', async () => {
    vi.mocked(client.GET).mockImplementation((path: string, init?: { params?: { query?: { date?: string } } }) => {
      if (path === '/api/config') {
        return Promise.resolve({
          data: { utcOffsetMinutes: -180, slotMinutes: 30, minLeadHours: 2, maxDaysAhead: 60, changeWindowHours: 48 },
          error: undefined,
          response: new Response(null, { status: 200 }),
        }) as never;
      }
      if (init?.params?.query?.date === '2026-10-03') {
        return Promise.resolve({
          data: { date: '2026-10-03', starts: ['2026-10-03T17:00:00Z'], sameWeekSuggestion: null },
          error: undefined,
          response: new Response(null, { status: 200 }),
        }) as never;
      }
      return Promise.resolve({
        data: {
          date: '2026-10-01',
          starts: ['2026-10-01T18:00:00Z'],
          sameWeekSuggestion: { date: '2026-10-03', starts: ['2026-10-03T17:00:00Z'] },
        },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }) as never;
    });
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText('seed'));
    await user.click(await screen.findByRole('button', { name: 'Usar esta data' }));

    expect(await screen.findByText('14:00')).toBeInTheDocument();
  });

  it('starts from an already-chosen date instead of resetting to today (e.g. returning from a 409)', async () => {
    renderStepWithDateSeed();

    await waitFor(() => {
      const availabilityCall = vi
        .mocked(client.GET)
        .mock.calls.find(
          (call) => call[0] === '/api/availability' && (call[1] as never as { params: { query: { date: string } } })?.params?.query?.date === PRECHOSEN_DATE,
        );
      expect(availabilityCall).toBeDefined();
    });
  });
});
