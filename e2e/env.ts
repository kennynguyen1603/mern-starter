/**
 * Isolated E2E stack. Every value here is fake and every service binds to
 * 127.0.0.1 on a non-default port, so tests can never touch a real DB,
 * Redis, mailbox or secret.
 */
export const PORTS = {
  api: 8099,
  web: 5183,
  admin: 5184,
  mongo: 27999,
  redis: 6399,
  mail: 4599,
} as const;

export const API_URL = `http://localhost:${PORTS.api}`;
export const WEB_URL = `http://localhost:${PORTS.web}`;
export const ADMIN_URL = `http://localhost:${PORTS.admin}`;
export const MONGO_URI = `mongodb://127.0.0.1:${PORTS.mongo}`;
export const REDIS_URL = `redis://127.0.0.1:${PORTS.redis}`;
export const MAIL_URL = `http://127.0.0.1:${PORTS.mail}`;
export const DB_NAME = 'mern_e2e';

export const API_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: String(PORTS.api),
  FRONTEND_URL: WEB_URL,
  ADMIN_URL,
  TRUST_PROXY: '0',
  MONGODB_URI: MONGO_URI,
  DB_NAME,
  REDIS_URL,
  ENCRYPTION_KEY: 'test-encryption-key-0123456789abcdef',
  SESSION_SECRET: 'test-session-secret-0123456789abcdef',
  JWT_SECRET_ACCESS_TOKEN: 'test-access-secret-0123456789abcdef',
  JWT_SECRET_ACCESS_TOKEN_EXP: '15m',
  JWT_SECRET_REFRESH_TOKEN: 'test-refresh-secret-0123456789abcdef',
  JWT_SECRET_REFRESH_TOKEN_EXP: '7d',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: `${API_URL}/api/v1/auth/google/callback`,
  RESEND_API_KEY: 're_test_fake',
  // Read by the Resend SDK at import time — routes every email to the fake mailbox.
  RESEND_BASE_URL: MAIL_URL,
  FROM_EMAIL: 'noreply@example.test',
};
