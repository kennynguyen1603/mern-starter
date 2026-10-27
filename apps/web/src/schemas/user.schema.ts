import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Tên tối thiểu 2 ký tự')
    .max(50, 'Tên tối đa 50 ký tự')
    .optional(),
  avatar: z
    .string()
    .url('URL avatar không hợp lệ')
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
