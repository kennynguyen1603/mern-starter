// In-memory stand-in for src/config/redis/redis.ts (only the methods the app uses).
// TTLs are ignored; tests call __reset between cases instead.
const store = new Map<string, string>();

export const redis = {
  async connect(): Promise<void> {},
  async disconnect(): Promise<void> {},
  isConnected(): boolean {
    return true;
  },
  async get(key: string): Promise<string | null> {
    return store.get(key) ?? null;
  },
  async setWithExpiry(key: string, value: string): Promise<boolean> {
    store.set(key, value);
    return true;
  },
  async del(key: string): Promise<number> {
    return store.delete(key) ? 1 : 0;
  },
  async incr(key: string): Promise<number> {
    const next = Number(store.get(key) ?? 0) + 1;
    store.set(key, String(next));
    return next;
  },
  async expire(): Promise<boolean> {
    return true;
  },
  async incrWithExpiry(key: string): Promise<number> {
    return redis.incr(key);
  },
  async rateLimiter(key: string, limit: number): Promise<boolean> {
    const count = await redis.incrWithExpiry(`${key}:count`);
    return count <= limit;
  },
  __reset(): void {
    store.clear();
  },
};

export default redis;
