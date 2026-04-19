import { Request, Response, NextFunction } from 'express';
import { redis } from '@/config/redis/redis.js';
import { TOO_MANY_REQUESTS } from '@/core/error.response.js';

/**
 * Middleware sử dụng Redis Rate Limiter để chống DDOS / Spam Request.
 * Tận dụng class `Redis` từ file config.
 *
 * @param limit Số lượt request tối đa
 * @param windowSeconds Cửa sổ thời gian (giây) tính cho số lượt đó
 */
export const rateLimitMiddleware = (limit: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Xác định định danh: Lấy User ID nếu đã login, ngược lại lấy IP
      const identifier = req.user?.userId || req.ip || 'unknown_ip';

      // Tạo key chuyên biệt cho từng route cụ thể
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
