import { z } from 'zod';

const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = {
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Invalid email address')),
    password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
  }),
};

export const registerSchema = {
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
    password: passwordSchema,
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z
      .string({ message: 'Refresh token is required' })
      .min(1, 'Refresh token is required'),
  }),
};

export const verifyEmailSchema = {
  query: z.object({
    token: z.string({ message: 'Token is required' }).min(1, 'Token is required'),
  }),
};

export const resendVerificationSchema = {
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Invalid email address')),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Invalid email address')),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Invalid email address')),
    otp: z
      .string({ message: 'OTP is required' })
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d+$/, 'OTP must contain digits only'),
    newPassword: passwordSchema,
  }),
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string({ message: 'Current password is required' }).min(1),
    newPassword: passwordSchema,
  }),
};

export const setPasswordSchema = {
  body: z.object({
    newPassword: passwordSchema,
  }),
};

export const googleLinkSchema = {
  body: z.object({
    pendingToken: z.string({ message: 'Pending token is required' }).min(1),
    password: z.string({ message: 'Password is required' }).min(1),
  }),
};
