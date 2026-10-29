import { config } from 'dotenv';
import argv from 'minimist';
import { z } from 'zod';
import path from 'path';

const options = argv(process.argv.slice(2));

// Load base env
config({
  path: path.resolve(process.cwd(), `.env.${options.env || 'development'}`),
});

const schema = z
  .object({
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    FRONTEND_URL: z.url(),
    ADMIN_URL: z.url().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    MONGODB_URI: z.string().min(1),
    DB_NAME: z.string().min(1),

    ENCRYPTION_KEY: z.string().min(32),
    SESSION_SECRET: z.string().min(32),

    JWT_SECRET_ACCESS_TOKEN: z.string().min(32),
    JWT_SECRET_ACCESS_TOKEN_EXP: z.string(),
    JWT_SECRET_REFRESH_TOKEN: z.string().min(32),
    JWT_SECRET_REFRESH_TOKEN_EXP: z.string(),

    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.coerce.number().optional(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_CALLBACK_URL: z.url(),

    RESEND_API_KEY: z.string().min(1),
    FROM_EMAIL: z.string().min(1),
  })
  .refine((data) => data.REDIS_URL || (data.REDIS_HOST && data.REDIS_PORT), {
    message: 'Either REDIS_URL or REDIS_HOST + REDIS_PORT must be provided',
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid ENV:',
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1);
}

const envRaw = parsed.data;

export const env = Object.freeze({
  port: envRaw.PORT,
  nodeEnv: envRaw.NODE_ENV,
  frontendUrl: envRaw.FRONTEND_URL,
  adminUrl: envRaw.ADMIN_URL,
  trustProxy: envRaw.TRUST_PROXY,
  encryptionKey: envRaw.ENCRYPTION_KEY,
  sessionSecret: envRaw.SESSION_SECRET,

  mongo: {
    uri: envRaw.MONGODB_URI,
    dbName: envRaw.DB_NAME,
  },

  jwt: {
    accessSecret: envRaw.JWT_SECRET_ACCESS_TOKEN,
    accessSecretExp: envRaw.JWT_SECRET_ACCESS_TOKEN_EXP,
    refreshSecret: envRaw.JWT_SECRET_REFRESH_TOKEN,
    refreshSecretExp: envRaw.JWT_SECRET_REFRESH_TOKEN_EXP,
  },

  redis: {
    url:
      envRaw.REDIS_URL || `redis://${envRaw.REDIS_HOST}:${envRaw.REDIS_PORT}`,
  },

  oauth: {
    google: {
      clientId: envRaw.GOOGLE_CLIENT_ID,
      clientSecret: envRaw.GOOGLE_CLIENT_SECRET,
      callbackUrl: envRaw.GOOGLE_CALLBACK_URL,
    },
  },

  email: {
    resendApiKey: envRaw.RESEND_API_KEY,
    fromEmail: envRaw.FROM_EMAIL,
  },
} as const);
