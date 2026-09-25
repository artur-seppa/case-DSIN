import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { sessionQueryOptions, type Session } from '@/features/auth/api/session';
import { AdminSidebar } from '@/shared/ui/admin-sidebar';

export function assertAdminSession(session: Session): void {
  if (session.role !== 'ADMIN') {
    throw redirect({ to: '/' });
  }
}

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    assertAdminSession(session);
  },
  component: () => (
    <div className="flex h-screen bg-bg-page">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  ),
});
