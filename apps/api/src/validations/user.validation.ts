import { z } from 'zod';

export const registerUserSchema = {
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be at most 50 characters')
      .trim(),
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Invalid email address')),

    password: z
      .string({ message: 'Password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must be at most 100 characters'),
  }),
};

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
