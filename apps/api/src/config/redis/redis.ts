import { createClient } from 'redis';
import { env } from '@/config/env/env.js';

class Redis {
  private static instance: Redis;
  private client: ReturnType<typeof createClient>;

  private constructor() {
    this.client = createClient({
      url: env.redis.url,
    });

    this.client.on('error', (err: Error) =>
      console.error('❌ Redis Client Error', err),
    );
    this.client.on('connect', () => console.log('✅ Redis Client Connected'));
    this.client.on('ready', () => console.log('Redis Client Ready'));
    this.client.on('end', () => console.log('Redis Client Connection Ended'));
    this.client.on('reconnecting', () =>
      console.log('Redis Client Reconnecting'),
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

  async setWithExpiry(
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<boolean> {
    try {
      if (expireSeconds) {
        const result = await this.client.set(key, value, { EX: expireSeconds });
        return result === 'OK';
      } else {
        const result = await this.client.set(key, value);
        return result === 'OK';
      }
    } catch (error) {
      console.error('Redis setWithExpiry error:', error);
      return false;
    }
  }

  async setEx(
    key: string,
    expireSeconds: number,
    value: string,
  ): Promise<string | null> {
    try {
      return await this.client.set(key, value, { EX: expireSeconds });
    } catch (error) {
      console.error('Redis setEx error:', error);
      return null;
    }
  }

  async setObject(
    key: string,
    obj: Record<string, unknown> | unknown[],
    expireSeconds?: number,
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      );

      if (expireSeconds) {
        const result = await this.client.set(key, serialized, {
          EX: expireSeconds,
        });
        return result === 'OK';
      }

      const result = await this.client.set(key, serialized);
      return result === 'OK';
    } catch (error) {
      console.error('Redis setObject error:', error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async flushAll(): Promise<string> {
    return await this.client.flushAll();
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async rateLimiter(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const countKey = `${key}:count`;
      const trackKey = `${key}:track`;

      const count = await this.client.incr(countKey);

      if (count === 1) {
        await this.client.expire(countKey, windowSeconds);
      }

      await this.client.lPush(trackKey, now.toString());
      await this.client.lTrim(trackKey, 0, 9);
      await this.client.expire(trackKey, windowSeconds);

      const timestamps = await this.client.lRange(trackKey, 0, -1);
      const times = timestamps.map((t: string) => parseInt(t));

      let suspicious = false;
      if (times.length > 1) {
        const tooFast = times.some((time: number, i: number) => {
          if (i === times.length - 1) return false;
          return times[i] - times[i + 1] < 100;
        });

        if (tooFast) {
          suspicious = true;
          await this.client.set(`${key}:suspicious`, '1', {
            EX: 24 * 60 * 60,
          });
        }
      }

      if (suspicious || count > limit) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Redis rateLimiter error:', error);
      return true;
    }
  }

  async set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<string | null> {
    return await this.client.set(key, value, options);
  }

  async lPush(key: string, value: string): Promise<number> {
    return await this.client.lPush(key, value);
  }

  async lTrim(key: string, start: number, stop: number): Promise<boolean> {
    try {
      const result = await this.client.lTrim(key, start, stop);
      return result === 'OK';
    } catch (error) {
      console.error('Redis lTrim error:', error);
      return false;
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const result = await this.client.lRange(key, start, stop);
    return result || [];
  }

  async sAdd(key: string, value: string): Promise<number> {
    return await this.client.sAdd(key, value);
  }

  async sRem(key: string, value: string): Promise<number> {
    return await this.client.sRem(key, value);
  }

  async sMembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  isConnected(): boolean {
    return this.client.isOpen;
  }
}

export const redis = Redis.getInstance();
