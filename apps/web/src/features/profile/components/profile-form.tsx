import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/lib/toast';
import { profileLabels } from '@/shared/labels/profile';
import { sessionQueryOptions } from '@/features/auth/api/session';
import { updateProfile } from '@/features/profile/api/update-profile';
import { profileSchema, type ProfileInput } from '@/features/profile/schemas/profile.schema';
import type { ApiError } from '@/shared/api/errors';
import type { Session } from '@/features/auth/api/session';

export function ProfileForm() {
  const { data: session } = useQuery(sessionQueryOptions);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: session ? { name: session.name, phone: session.phone ?? '' } : undefined,
  });
  const mutation = useMutation<Session, ApiError, ProfileInput>({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, updated);
      toast.success(profileLabels.saved);
    },
    onError: (error) => {
      if (error.message.toLowerCase().includes('telefone')) {
        setError('phone', { message: error.message });
      } else {
        toast.error(error.message);
      }
    },
  });

  if (!session) {
    return null;
  }

  const onSubmit = handleSubmit((input) => mutation.mutate(input));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{profileLabels.nameLabel}</Label>
        <Input id="name" type="text" autoComplete="name" {...register('name')} />
        {errors.name ? <p className="text-small text-error-700">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">
          {profileLabels.phoneLabel}{' '}
          <span className="text-text-secondary font-normal">{profileLabels.phoneOptionalHint}</span>
        </Label>
        <Input id="phone" type="tel" placeholder={profileLabels.phonePlaceholder} autoComplete="tel" {...register('phone')} />
        {errors.phone ? <p className="text-small text-error-700">{errors.phone.message}</p> : null}
      </div>

      <Button type="submit" disabled={isSubmitting || mutation.isPending}>
        {isSubmitting || mutation.isPending ? profileLabels.saving : profileLabels.saveButton}
      </Button>
    </form>
  );
}
