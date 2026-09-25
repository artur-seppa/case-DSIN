import { z } from 'zod';
import { authLabels } from '@/shared/labels/auth';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, authLabels.emailRequired)
    .email(authLabels.emailInvalid),
  password: z.string().min(1, authLabels.passwordRequired),
});

export type LoginInput = z.infer<typeof loginSchema>;
