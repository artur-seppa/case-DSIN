import { useMutation, useQueryClient } from '@tanstack/react-query';
import { register } from '@/features/auth/api/register';
import { sessionQueryOptions } from '@/features/auth/api/session';

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, session);
    },
  });
}
