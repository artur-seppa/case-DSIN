import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from '@/features/auth/api/session';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(sessionQueryOptions);
    } catch {
      throw redirect({ to: '/login' });
    }
  },
  component: () => <Outlet />,
});
