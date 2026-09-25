import { createFileRoute } from '@tanstack/react-router';
import { ProfessionalDetailScreen } from '@/features/catalog/components/professional-detail';

export const Route = createFileRoute('/_authenticated/admin/professionals/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ProfessionalDetailScreen id={id} />;
}
