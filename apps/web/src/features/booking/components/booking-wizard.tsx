import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { bookingLabels } from '@/shared/labels/booking';
import { authLabels } from '@/shared/labels/auth';
import { client } from '@/shared/api/client';
import { useBookingWizard } from '@/features/booking/context/booking-wizard-context';
import { StepServices } from '@/features/booking/components/step-services';
import { StepSchedule } from '@/features/booking/components/step-schedule';
import { StepReview } from '@/features/booking/components/step-review';

function stepLabel(step: 1 | 2 | 3): string {
  if (step === 1) return bookingLabels.step1Label;
  if (step === 2) return bookingLabels.step2Label;
  return bookingLabels.step3Label;
}

export function BookingWizard() {
  const { state, reset } = useBookingWizard();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await client.POST('/api/auth/logout');
    } finally {
      queryClient.clear();
      navigate({ to: '/login' });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      <header className="flex flex-col gap-2 border-b border-border bg-bg-surface p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-h3 font-semibold text-text-primary">{bookingLabels.wizardTitle}</h1>
          <div className="flex items-center gap-4">
            <Link to="/appointments" className="text-small font-medium text-text-secondary">
              {bookingLabels.myAppointmentsLink}
            </Link>
            <button
              type="button"
              className="text-small font-medium text-text-secondary"
              onClick={handleLogout}
            >
              {authLabels.logout}
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-1 flex-1 rounded-full ${step <= state.step ? 'bg-accent-700' : 'bg-border'}`}
            />
          ))}
        </div>
        <span className="text-small text-text-secondary">{stepLabel(state.step)}</span>
      </header>

      {state.step === 1 ? <StepServices /> : null}
      {state.step === 2 ? <StepSchedule /> : null}
      {state.step === 3 ? (
        <StepReview
          onConfirmed={() => {
            reset();
            navigate({ to: '/appointments' });
          }}
        />
      ) : null}
    </div>
  );
}
