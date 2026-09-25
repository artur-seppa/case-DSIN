import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from '@/features/auth/api/session';

export const Route = createFileRoute('/_authenticated/_client')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session.role !== 'CLIENT') {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});
