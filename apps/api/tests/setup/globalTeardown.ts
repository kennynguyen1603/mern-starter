import fs from 'node:fs';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { MONGO_URI_FILE } from './globalSetup';

export default async function globalTeardown(): Promise<void> {
  const mongod = (globalThis as { __MONGOD__?: MongoMemoryServer }).__MONGOD__;
  await mongod?.stop();
  fs.rmSync(MONGO_URI_FILE, { force: true });
}
