import { createFileRoute } from '@tanstack/react-router';
import { RepositionItemScreen } from '@/features/appointments/components/reposition-item-screen';

export const Route = createFileRoute('/_authenticated/_client/appointments/$id/items/$itemId/reposition')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id, itemId } = Route.useParams();
  return <RepositionItemScreen appointmentId={id} itemId={itemId} />;
}
