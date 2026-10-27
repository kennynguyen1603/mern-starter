import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const MONGO_URI_FILE = path.join(os.tmpdir(), 'mern-api-jest-mongo-uri');

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create({
    binary: { version: '8.2.6' },
  });
  fs.writeFileSync(MONGO_URI_FILE, mongod.getUri());
  (globalThis as { __MONGOD__?: MongoMemoryServer }).__MONGOD__ = mongod;
}
