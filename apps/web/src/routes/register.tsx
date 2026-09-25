import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { RegisterForm } from '@/features/auth/components/register-form';
import { authLabels } from '@/shared/labels/auth';
import { sessionQueryOptions } from '@/features/auth/api/session';

export const Route = createFileRoute('/register')({
  beforeLoad: async ({ context }) => {
    const hasSession = await context.queryClient
      .ensureQueryData(sessionQueryOptions)
      .then(() => true)
      .catch(() => false);
    if (hasSession) {
      throw redirect({ to: '/' });
    }
  },
  component: RegisterRoute,
});

function RegisterRoute() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{authLabels.registerTitle}</CardTitle>
          <p className="text-small text-text-secondary">{authLabels.registerSubtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegisterForm onSuccess={() => navigate({ to: '/' })} />
          <p className="text-small text-text-secondary text-center">
            {authLabels.haveAccount}{' '}
            <Link to="/login" className="text-accent-700 font-medium">
              {authLabels.goToLogin}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
