import { database } from '@/config/db/db.js';

export const connectTestDb = (): Promise<void> => database.connect();

export const clearDb = async (): Promise<void> => {
  const collections = await database.database.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

export const closeTestDb = (): Promise<void> => database.disconnect();
