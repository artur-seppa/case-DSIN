import { createFileRoute } from '@tanstack/react-router';
import { ProfessionalsList } from '@/features/catalog/components/professionals-list';

export const Route = createFileRoute('/_authenticated/admin/professionals/')({
  component: ProfessionalsList,
});
