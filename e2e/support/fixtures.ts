import { randomUUID } from 'node:crypto';
import {
  test as base,
  expect,
  request,
  type APIRequestContext,
} from '@playwright/test';
import { MongoClient, type Db } from 'mongodb';
import { createClient } from 'redis';
import { API_URL, DB_NAME, MAIL_URL, MONGO_URI, REDIS_URL } from '../env';

export const PASSWORD = 'Password123';

export type TestUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

type Email = { to: string | string[]; subject: string; html: string };

type Fixtures = {
  cleanState: void;
  createUser: (opts?: {
    role?: 'user' | 'admin';
    verified?: boolean;
  }) => Promise<TestUser>;
  /** A fresh, isolated cookie jar logged in as `user` against the API. */
  apiLogin: (user: TestUser) => Promise<APIRequestContext>;
  emailsTo: (email: string, subject?: string) => Promise<Email[]>;
  /** Polls the mailbox — some emails (e.g. verification on register) are sent fire-and-forget. */
  waitForEmail: (email: string, subject: string) => Promise<Email>;
};

type WorkerFixtures = {
  db: Db;
  redis: ReturnType<typeof createClient>;
};

const decodeEntities = (html: string) =>
  html
    .replace(/&#x3D;/g, '=')
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

export const SUBJECT = {
  verify: 'Xác nhận địa chỉ email của bạn',
  reset: 'Mã đặt lại mật khẩu của bạn',
} as const;

export const uniqueEmail = () => `user-${randomUUID()}@example.test`;

export const otpFrom = (email: Email) => {
  const otp = email.html.match(/>\s*(\d{6})\s*</)?.[1];
  if (!otp) throw new Error('OTP not found in email');
  return otp;
};

export const verifyLinkFrom = (email: Email) => {
  const link = email.html.match(
    /href=["']([^"']*verify-email\?token=[^"']+)["']/,
  )?.[1];
  if (!link) throw new Error('Verify link not found in email');
  return link;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    async ({}, use) => {
      const client = await MongoClient.connect(MONGO_URI);
      await use(client.db(DB_NAME));
      await client.close();
    },
    { scope: 'worker' },
  ],

  redis: [
    async ({}, use) => {
      const client = createClient({ url: REDIS_URL });
      await client.connect();
      await use(client);
      await client.close();
    },
    { scope: 'worker' },
  ],

  // Every test starts from an empty DB, Redis (sessions, blacklist, rate limits) and mailbox.
  cleanState: [
    async ({ db, redis }, use) => {
      await redis.flushDb();
      const collections = await db.collections();
      await Promise.all(collections.map((c) => c.deleteMany({})));
      await fetch(`${MAIL_URL}/__emails`, { method: 'DELETE' });
      await use();
    },
    { auto: true },
  ],

  createUser: async ({ db }, use) => {
    const api = await request.newContext({ baseURL: API_URL });
    await use(async ({ role = 'user', verified = true } = {}) => {
      const user = {
        name: 'Test User',
        email: uniqueEmail(),
        password: PASSWORD,
      };
      const res = await api.post('/api/v1/auth/register', { data: user });
      expect(res.status()).toBe(201);
      const { data } = await res.json();
      // Set before login: unverified accounts cannot log in.
      await db
        .collection('users')
        .updateOne(
          { email: user.email },
          { $set: { role, isEmailVerified: verified } },
        );
      return { id: data.user._id, ...user };
    });
    await api.dispose();
  },

  apiLogin: async ({}, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (user) => {
      const ctx = await request.newContext({ baseURL: API_URL });
      contexts.push(ctx);
      const res = await ctx.post('/api/v1/auth/login', {
        data: { email: user.email, password: user.password },
      });
      expect(res.status()).toBe(200);
      return ctx;
    });
    await Promise.all(contexts.map((c) => c.dispose()));
  },

  emailsTo: async ({}, use) => {
    await use(async (address, subject) => {
      const res = await fetch(`${MAIL_URL}/__emails`);
      const emails = (await res.json()) as Email[];
      return emails
        .filter((e) => [e.to].flat().includes(address))
        .filter((e) => subject === undefined || e.subject === subject)
        .map((e) => ({ ...e, html: decodeEntities(e.html) }));
    });
  },

  waitForEmail: async ({ emailsTo }, use) => {
    await use(async (address, subject) => {
      let found: Email[] = [];
      await expect
        .poll(async () => (found = await emailsTo(address, subject)).length)
        .toBeGreaterThan(0);
      return found.at(-1)!;
    });
  },
});

export { expect };
