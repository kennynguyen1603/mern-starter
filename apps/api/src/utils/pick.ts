import type { Request } from 'express';

const SENSITIVE_FIELDS = new Set([
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  'otp',
  'pendingToken',
]);

const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [
      key,
      SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : redactSensitive(v),
    ]),
  );
};

export interface SanitizedRequest {
  method: string;
  url: string;
  params: Request['params'];
  query: Record<string, unknown>;
  body: unknown;
  ip: string | undefined;
  userId: string;
}

export const sanitizeRequest = (req: Request): SanitizedRequest => ({
  method: req.method,
  url: req.originalUrl.split('?')[0],
  params: req.params,
  query: redactSensitive(req.query) as Record<string, unknown>,
  body: redactSensitive(req.body),
  ip: req.ip || req.socket?.remoteAddress,
  userId: req.user?.userId || 'ANONYMOUS',
});
