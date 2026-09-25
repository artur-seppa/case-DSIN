import { createFileRoute } from '@tanstack/react-router';
import { WeeklyDashboard } from '@/features/reports/components/weekly-dashboard';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: WeeklyDashboard,
});
