import { createFileRoute } from '@tanstack/react-router';
import { ServicesList } from '@/features/catalog/components/services-list';

export const Route = createFileRoute('/_authenticated/admin/services')({
  component: ServicesList,
});
