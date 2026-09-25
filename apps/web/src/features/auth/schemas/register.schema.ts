import { z } from 'zod';
import { authLabels } from '@/shared/labels/auth';

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, authLabels.nameRequired)
    .min(2, authLabels.nameTooShort),
  email: z
    .string()
    .min(1, authLabels.emailRequired)
    .email(authLabels.emailInvalid),
  phone: z.string().optional(),
  password: z
    .string()
    .min(1, authLabels.passwordRequired)
    .min(8, authLabels.passwordTooShort),
});

export type RegisterInput = z.infer<typeof registerSchema>;
