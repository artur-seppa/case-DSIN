import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { client } from '@/shared/api/client';
import { profileLabels } from '@/shared/labels/profile';
import { ProfileForm } from '@/features/profile/components/profile-form';

export const Route = createFileRoute('/_authenticated/_client/_tabs/profile')({
  component: ProfileRoute,
});

function ProfileRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await client.POST('/api/auth/logout');
    } finally {
      queryClient.clear();
      navigate({ to: '/login' });
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-display text-h2 font-semibold text-text-primary">{profileLabels.screenTitle}</h1>
      <ProfileForm />
      <Button type="button" variant="ghost" className="self-start text-error-700" onClick={handleLogout}>
        {profileLabels.logout}
      </Button>
    </div>
  );
}
