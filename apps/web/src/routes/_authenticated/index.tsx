import { createFileRoute, redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from '@/features/auth/api/session';

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session.role === 'CLIENT') {
      throw redirect({ to: '/book' });
    }
    throw redirect({ to: '/admin' });
  },
});
