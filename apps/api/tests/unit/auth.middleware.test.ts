import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@mern/shared';
import {
  requireAdmin,
  requireAuth,
  requireOwnerOrAdmin,
} from '@/middlewares/auth.middleware.js';
import { jwtService } from '@/services/jwt.service.js';
import { tokenRepository } from '@/repositories/token.repository.js';
import { ErrorResponse } from '@/core/error.response.js';

const res = {} as Response;

const accessToken = (role: string = UserRole.USER) =>
  jwtService.generateAccessToken({ userId: 'user-1', role, sessionId: 's-1' });

const makeReq = (partial: Partial<Request>): Request =>
  ({ headers: {}, cookies: {}, params: {}, ...partial }) as Request;

const expectError = (fn: () => unknown, status: number, message: string) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ErrorResponse);
    expect((err as ErrorResponse).status).toBe(status);
    expect((err as ErrorResponse).message).toBe(message);
    return;
  }
  throw new Error('expected function to throw');
};

describe('requireAuth', () => {
  let blacklisted: jest.SpyInstance;

  beforeEach(() => {
    blacklisted = jest
      .spyOn(tokenRepository, 'isSessionBlacklisted')
      .mockResolvedValue(false);
  });

  afterEach(() => jest.restoreAllMocks());

  const run = async (req: Request) => {
    const next = jest.fn() as unknown as NextFunction;
    await requireAuth(req, res, next);
    return next as jest.Mock;
  };

  it('rejects a request without any token', async () => {
    await expect(run(makeReq({}))).rejects.toMatchObject({
      status: 401,
      message: 'Access token is required',
    });
  });

  it('rejects a malformed Authorization header', async () => {
    await expect(
      run(makeReq({ headers: { authorization: 'Token abc' } })),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid token format. Expected: Bearer <token>',
    });
  });

  it('rejects an expired access token', async () => {
    const expired = jwt.sign(
      { userId: 'user-1', sessionId: 's-1', type: 'access' },
      'test-access-secret',
      { expiresIn: -10, issuer: 'mern-server', audience: 'mern-client' },
    );
    await expect(
      run(makeReq({ headers: { authorization: `Bearer ${expired}` } })),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Access token has expired. Please refresh your session.',
    });
  });

  it('rejects a token signed with another secret', async () => {
    const forged = jwt.sign(
      { userId: 'user-1', sessionId: 's-1', type: 'access' },
      'other-secret',
      { issuer: 'mern-server', audience: 'mern-client' },
    );
    await expect(
      run(makeReq({ headers: { authorization: `Bearer ${forged}` } })),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid access token. Please login again.',
    });
  });

  it('rejects a revoked (blacklisted) session', async () => {
    blacklisted.mockResolvedValue(true);
    await expect(
      run(makeReq({ cookies: { accessToken: accessToken() } })),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Your session has been revoked. Please login again.',
    });
    expect(blacklisted).toHaveBeenCalledWith('s-1');
  });

  it('accepts a token from the accessToken cookie', async () => {
    const req = makeReq({ cookies: { accessToken: accessToken() } });
    const next = await run(req);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      userId: 'user-1',
      role: UserRole.USER,
      sessionId: 's-1',
    });
  });

  it('accepts a Bearer token from the Authorization header', async () => {
    const req = makeReq({
      headers: { authorization: `Bearer ${accessToken(UserRole.ADMIN)}` },
    });
    const next = await run(req);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.role).toBe(UserRole.ADMIN);
  });
});

describe('requireOwnerOrAdmin', () => {
  const user = (userId: string, role: UserRole) => ({
    userId,
    role,
    sessionId: 's-1',
  });

  it('returns 401 when the request is not authenticated', () => {
    expectError(
      () => requireOwnerOrAdmin(makeReq({}), res, jest.fn()),
      401,
      'Authentication required to perform this action',
    );
  });

  it('returns 403 for a non-owner, non-admin user', () => {
    const req = makeReq({
      params: { id: 'someone-else' },
      user: user('user-1', UserRole.USER),
    });
    expectError(
      () => requireOwnerOrAdmin(req, res, jest.fn()),
      403,
      'Access Denied: You do not have permission to modify or access this resource',
    );
  });

  it('allows the owner of the resource', () => {
    const next = jest.fn();
    requireOwnerOrAdmin(
      makeReq({
        params: { id: 'user-1' },
        user: user('user-1', UserRole.USER),
      }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('allows an admin on any resource', () => {
    const next = jest.fn();
    requireOwnerOrAdmin(
      makeReq({
        params: { id: 'someone-else' },
        user: user('admin-1', UserRole.ADMIN),
      }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('returns 401 when the request is not authenticated', () => {
    expectError(
      () => requireAdmin(makeReq({}), res, jest.fn()),
      401,
      'Authentication required to perform this action',
    );
  });

  it('returns 403 for a regular user', () => {
    const req = makeReq({
      user: { userId: 'user-1', role: UserRole.USER, sessionId: 's-1' },
    });
    expectError(
      () => requireAdmin(req, res, jest.fn()),
      403,
      'Access Denied: You do not have permission to access this resource',
    );
  });

  it('allows an admin', () => {
    const next = jest.fn();
    requireAdmin(
      makeReq({
        user: { userId: 'admin-1', role: UserRole.ADMIN, sessionId: 's-1' },
      }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });
});
