import { Request, Response, NextFunction } from 'express';
import { redis } from '@/config/redis/redis.js';
import { TOO_MANY_REQUESTS } from '@/core/error.response.js';

/**
 * Middleware using Redis Rate Limiter to prevent DDOS / Spam Request.
 * Leverage `Redis` class from config file.
 *
 * @param limit Maximum number of requests allowed
 * @param windowSeconds Time window (seconds) for the limit
 */
export const rateLimitMiddleware = (limit: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Determine identifier: Get User ID if logged in, otherwise get IP
      const identifier = req.user?.userId || req.ip || 'unknown_ip';

      // Create specific key for each route
      const key = `ratelimit:${req.baseUrl}${req.path}:${identifier}`;

      const isAllowed = await redis.rateLimiter(key, limit, windowSeconds);

      if (!isAllowed) {
        throw new TOO_MANY_REQUESTS();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
