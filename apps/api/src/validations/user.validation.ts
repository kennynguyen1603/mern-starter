import { z } from 'zod';

export const updateUserSchema = {
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be at most 50 characters')
      .trim()
      .optional(),
    avatar: z.url({ message: 'Avatar must be a valid URL' }).optional(),
  }),
  params: z.object({
    id: z.string({ message: 'User ID is required' }).min(1),
  }),
};

export const userIdParamsSchema = {
  params: z.object({
    id: z.string({ message: 'User ID is required' }).min(1),
  }),
};

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'email', 'createdAt']).optional(),
    sortOrder: z.enum(['ASC', 'DESC']).optional(),
  }),
};

export type UpdateUserBody = z.infer<typeof updateUserSchema.body>;
export type UserIdParams = z.infer<typeof userIdParamsSchema.params>;
export type ListUsersQuery = z.infer<typeof listUsersSchema.query>;
