import { createFileRoute } from '@tanstack/react-router';
import { AppointmentDetailScreen } from '@/features/appointments/components/appointment-detail';

export const Route = createFileRoute('/_authenticated/_client/_tabs/appointments/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <AppointmentDetailScreen id={id} />;
}
