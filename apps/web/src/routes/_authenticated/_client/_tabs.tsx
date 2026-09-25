import { createFileRoute, Outlet } from '@tanstack/react-router';
import { BottomNav } from '@/shared/ui/bottom-nav';

export const Route = createFileRoute('/_authenticated/_client/_tabs')({
  component: () => (
    <div className="flex min-h-screen flex-col bg-bg-page">
      <div className="flex-1 overflow-y-auto pb-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  ),
});
