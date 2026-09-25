import { createFileRoute } from '@tanstack/react-router';
import { AddItemScreen } from '@/features/appointments/components/add-item-screen';

export const Route = createFileRoute('/_authenticated/_client/appointments/$id/add-item')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <AddItemScreen appointmentId={id} />;
}
