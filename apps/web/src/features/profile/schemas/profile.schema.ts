import { z } from 'zod';
import { profileLabels } from '@/shared/labels/profile';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, profileLabels.nameRequired)
    .min(2, profileLabels.nameTooShort),
  phone: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
