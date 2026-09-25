import { createFileRoute } from '@tanstack/react-router';
import { AppointmentsList } from '@/features/appointments/components/appointments-list';

export const Route = createFileRoute('/_authenticated/_client/_tabs/appointments/')({
  component: AppointmentsList,
});
