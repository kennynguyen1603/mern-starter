import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@/core/error.response.js';
import { jwtService } from '@/services/jwt.service.js';
import { UserRole } from '@mern/shared';

// Extract Access Token: priority HttpOnly cookie, fallback to Authorization header
const extractAccessToken = (req: Request): string => {
  const cookieToken = req.cookies?.accessToken as string | undefined;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedError('Access token is required');
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    throw new UnauthorizedError(
      'Invalid token format. Expected: Bearer <token>',
    );
  }

  return token;
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractAccessToken(req);

  const payload = jwtService.verifyAccessToken(token);
  if (!payload) {
    throw new UnauthorizedError(
      'Token is invalid or expired. Please login again.',
    );
  }

  req.user = {
    userId: payload.userId,
    role: payload.role,
    sessionId: payload.sessionId,
  };

  next();
};

export const requireOwnerOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    throw new UnauthorizedError(
      'Authentication required to perform this action',
    );
  }

  const { id } = req.params;
  const isOwner = req.user.userId === id;
  const isAdmin = req.user.role === UserRole.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      'Access Denied: You do not have permission to modify or access this resource',
    );
  }

  next();
};
