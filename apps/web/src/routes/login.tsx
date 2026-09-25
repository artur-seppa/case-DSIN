import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';
import { authLabels } from '@/shared/labels/auth';
import { sessionQueryOptions } from '@/features/auth/api/session';

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const hasSession = await context.queryClient
      .ensureQueryData(sessionQueryOptions)
      .then(() => true)
      .catch(() => false);
    if (hasSession) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{authLabels.loginTitle}</CardTitle>
          <p className="text-small text-text-secondary">{authLabels.loginSubtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginForm onSuccess={() => navigate({ to: '/' })} />
          <p className="text-small text-text-secondary text-center">
            {authLabels.noAccount}{' '}
            <Link to="/register" className="text-accent-700 font-medium">
              {authLabels.goToRegister}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
