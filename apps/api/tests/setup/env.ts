import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Fake values only — dotenv does not override variables that are already set.
const uriFile = path.join(os.tmpdir(), 'mern-api-jest-mongo-uri');

Object.assign(process.env, {
  PORT: '8080',
  NODE_ENV: 'test',
  FRONTEND_URL: 'http://localhost:5173',
  TRUST_PROXY: '0',
  MONGODB_URI: fs.existsSync(uriFile)
    ? fs.readFileSync(uriFile, 'utf8')
    : 'mongodb://127.0.0.1:27017',
  DB_NAME: 'mern_test',
  ENCRYPTION_KEY: 'test-encryption-key-0123456789abcdef',
  SESSION_SECRET: 'test-session-secret-0123456789abcdef',
  JWT_SECRET_ACCESS_TOKEN: 'test-access-secret-0123456789abcdef',
  JWT_SECRET_ACCESS_TOKEN_EXP: '15m',
  JWT_SECRET_REFRESH_TOKEN: 'test-refresh-secret-0123456789abcdef',
  JWT_SECRET_REFRESH_TOKEN_EXP: '7d',
  REDIS_URL: 'redis://localhost:6379',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:8080/api/v1/auth/google/callback',
  RESEND_API_KEY: 're_test_key',
  FROM_EMAIL: 'noreply@example.test',
});
