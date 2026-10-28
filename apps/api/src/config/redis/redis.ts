import { createClient } from 'redis';
import { env } from '@/config/env/env.js';
import { logger } from '@/utils/logger.js';

class Redis {
  private static instance: Redis;
  private client: ReturnType<typeof createClient>;

  private constructor() {
    this.client = createClient({
      url: env.redis.url,
    });

    this.client.on('error', (err: Error) =>
      logger.error('Redis client error', 'Redis', '', { error: err.message }),
    );
    this.client.on('ready', () => logger.info('Redis client ready', 'Redis'));
    this.client.on('end', () =>
      logger.info('Redis client connection ended', 'Redis'),
    );
    this.client.on('reconnecting', () =>
      logger.warn('Redis client reconnecting', 'Redis'),
    );
  }

  static getInstance(): Redis {
    if (!Redis.instance) {
      Redis.instance = new Redis();
    }
    return Redis.instance;
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  // Atomic INCR + EXPIRE NX so a crash between them can't leave a key without TTL,
  // and the window starts at the first hit instead of sliding on every hit.
  async incrWithExpiry(key: string, seconds: number): Promise<number> {
    const [count] = (await this.client
      .multi()
      .incr(key)
      .expire(key, seconds, 'NX')
      .exec()) as unknown as [number, number];
    return count;
  }

  async rateLimiter(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    try {
      const count = await this.incrWithExpiry(`${key}:count`, windowSeconds);
      return count <= limit;
    } catch (error) {
      logger.error('Redis rateLimiter error', 'Redis', '', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fail closed: deny when the limiter is unavailable
      return false;
    }
  }
}

export const redis = Redis.getInstance();
