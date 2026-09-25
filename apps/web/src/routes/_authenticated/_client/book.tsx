import { createFileRoute } from '@tanstack/react-router';
import { BookingWizardProvider } from '@/features/booking/context/booking-wizard-context';
import { BookingWizard } from '@/features/booking/components/booking-wizard';

export const Route = createFileRoute('/_authenticated/_client/book')({
  component: BookRoute,
});

function BookRoute() {
  return (
    <BookingWizardProvider>
      <BookingWizard />
    </BookingWizardProvider>
  );
}
