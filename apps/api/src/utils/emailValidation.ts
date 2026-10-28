import { BadRequestError } from '@/core/error.response.js';

export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateAndNormalizeEmail = (email: string): string => {
  if (!email) {
    throw new BadRequestError('Email is required');
  }

  if (!isValidEmail(email)) {
    throw new BadRequestError('Invalid email format');
  }

  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail;
};
