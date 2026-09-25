import { createFileRoute } from '@tanstack/react-router';
import { QueueDetail } from '@/features/queue/components/queue-detail';

export const Route = createFileRoute('/_authenticated/admin/queue/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <QueueDetail id={id} />;
}
