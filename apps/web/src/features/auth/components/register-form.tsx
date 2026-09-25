import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { authLabels } from '@/shared/labels/auth';
import { useRegister } from '@/features/auth/hooks/use-register';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas/register.schema';
import type { ApiError } from '@/shared/api/errors';

export interface RegisterFormProps {
  onSuccess: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const registerMutation = useRegister();

  const onSubmit = handleSubmit(async (input) => {
    try {
      await registerMutation.mutateAsync(input);
      onSuccess();
    } catch {}
  });

  const serverError = registerMutation.error as ApiError | null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{authLabels.nameLabel}</Label>
        <Input
          id="name"
          type="text"
          placeholder={authLabels.namePlaceholder}
          autoComplete="name"
          {...registerField('name')}
        />
        {errors.name ? (
          <p className="text-small text-error-700">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{authLabels.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          placeholder={authLabels.emailPlaceholder}
          autoComplete="email"
          {...registerField('email')}
        />
        {errors.email ? (
          <p className="text-small text-error-700">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">
          {authLabels.phoneLabel}{' '}
          <span className="text-text-secondary font-normal">{authLabels.phoneOptionalHint}</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder={authLabels.phonePlaceholder}
          autoComplete="tel"
          {...registerField('phone')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{authLabels.passwordLabel}</Label>
        <Input
          id="password"
          type="password"
          placeholder={authLabels.passwordPlaceholder}
          autoComplete="new-password"
          {...registerField('password')}
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

      <Button type="submit" disabled={isSubmitting || registerMutation.isPending}>
        {isSubmitting || registerMutation.isPending
          ? authLabels.registerSubmitting
          : authLabels.registerSubmit}
      </Button>
    </form>
  );
}
