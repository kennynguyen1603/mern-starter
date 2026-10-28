import type { Request } from 'express';
import { sanitizeRequest } from '@/utils/pick.js';

describe('sanitizeRequest', () => {
  it('redacts nested secrets and strips the query string from the url', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/auth/verify-email?token=abc',
      params: {},
      query: { token: 'abc', page: '1' },
      body: {
        email: 'a@example.com',
        password: 'Secret123',
        nested: [{ refreshToken: 'r', keep: 1 }],
      },
      ip: '127.0.0.1',
    } as unknown as Request;

    expect(sanitizeRequest(req)).toEqual({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      params: {},
      query: { token: '[REDACTED]', page: '1' },
      body: {
        email: 'a@example.com',
        password: '[REDACTED]',
        nested: [{ refreshToken: '[REDACTED]', keep: 1 }],
      },
      ip: '127.0.0.1',
      userId: 'ANONYMOUS',
    });
  });
});
