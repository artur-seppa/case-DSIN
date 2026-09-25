import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { authLabels } from '@/shared/labels/auth';
import { useLogin } from '@/features/auth/hooks/use-login';
import { loginSchema, type LoginInput } from '@/features/auth/schemas/login.schema';
import type { ApiError } from '@/shared/api/errors';

export interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const loginMutation = useLogin();

  const onSubmit = handleSubmit(async (input) => {
    try {
      await loginMutation.mutateAsync(input);
      onSuccess();
    } catch {}
  });

  const serverError = loginMutation.error as ApiError | null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{authLabels.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          placeholder={authLabels.emailPlaceholder}
          autoComplete="email"
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-small text-error-700">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{authLabels.passwordLabel}</Label>
        <Input
          id="password"
          type="password"
          placeholder={authLabels.passwordPlaceholder}
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-small text-error-700">{errors.password.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <p role="alert" className="text-small text-error-700">
          {serverError.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting || loginMutation.isPending}>
        {isSubmitting || loginMutation.isPending ? authLabels.submitting : authLabels.submit}
      </Button>
    </form>
  );
}
