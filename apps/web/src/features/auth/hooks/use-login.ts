import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login } from '@/features/auth/api/login';
import { sessionQueryOptions } from '@/features/auth/api/session';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, session);
    },
  });
}
