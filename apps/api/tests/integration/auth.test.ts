import request from 'supertest';
import { UserStatus } from '@mern/shared';
import app from '@/app.js';
import { redis } from '@/config/redis/redis.js';
import { userRepository } from '@/repositories/user.repository.js';
import { clearDb, closeTestDb, connectTestDb } from '../helpers/db.js';
import { createUser, DEFAULT_PASSWORD } from '../helpers/factories.js';
import { cookieValue, getCookies, loginAs } from '../helpers/auth.js';
import {
  googleProfile,
  installFakeGoogle,
  setGoogleProfile,
} from '../helpers/fakeGoogle.js';

type MockRedis = typeof redis & { __reset: () => void };

const FRONTEND = 'http://localhost:5173';

installFakeGoogle();

beforeAll(connectTestDb);
beforeEach(async () => {
  (redis as MockRedis).__reset();
  setGoogleProfile(null);
  await clearDb();
});
afterAll(closeTestDb);

describe('POST /api/v1/auth/register', () => {
  const body = {
    name: 'Alice',
    email: 'alice@example.com',
    password: DEFAULT_PASSWORD,
  };

  it('creates an account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(body)
      .expect(201);

    expect(res.body.message).toBe('Account created successfully');
    expect(res.body.data.user).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
    });
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('rejects an invalid payload with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(422);

    expect(res.body.error.message).toBe('Validation failed');
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser({ email: body.email });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(body)
      .expect(409);

    expect(res.body.error.message).toBe('Email have been already used.');
  });

  it('rate limits after 5 attempts', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ ...body, email: `r${i}@example.com` })
        .expect(201);
    }
    await request(app)
      .post('/api/v1/auth/register')
      .send({ ...body, email: 'r5@example.com' })
      .expect(429);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('sets access and refresh cookies', async () => {
    const { email } = await createUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: DEFAULT_PASSWORD })
      .expect(200);

    expect(res.body.message).toBe('Login successful');
    const cookies = getCookies(res);
    expect(cookieValue(cookies, 'accessToken')).toBeTruthy();
    const refresh = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('rejects a wrong password with 401', async () => {
    const { email } = await createUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Wrong12345' })
      .expect(401);

    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates tokens using the refresh cookie', async () => {
    const { email } = await createUser();
    const cookies = await loginAs(app, email, DEFAULT_PASSWORD);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.message).toBe('Token refreshed successfully');
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(cookieValue(getCookies(res), 'refreshToken')).not.toBe(
      cookieValue(cookies, 'refreshToken'),
    );
  });

  it('accepts the refresh token in the body', async () => {
    const { email } = await createUser();
    const refreshToken = cookieValue(
      await loginAs(app, email, DEFAULT_PASSWORD),
      'refreshToken',
    );

    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
  });

  it('rejects a reused refresh token', async () => {
    const { email } = await createUser();
    const cookies = await loginAs(app, email, DEFAULT_PASSWORD);
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);
    expect(res.body.error.message).toBe('Refresh token is invalid or expired');
  });

  it('requires a refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').expect(401);
    expect(res.body.error.message).toBe('Refresh token is required');
  });
});

describe('sessions and logout', () => {
  it('lists active sessions', async () => {
    const { email } = await createUser();
    await loginAs(app, email, DEFAULT_PASSWORD);
    const cookies = await loginAs(app, email, DEFAULT_PASSWORD);

    const res = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('requires authentication for sessions', async () => {
    const res = await request(app).get('/api/v1/auth/sessions').expect(401);
    expect(res.body.error.message).toBe('Access token is required');
  });

  it('logout clears cookies and revokes the access token', async () => {
    const { email } = await createUser();
    const cookies = await loginAs(app, email, DEFAULT_PASSWORD);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');
    const cleared = getCookies(res);
    expect(cookieValue(cleared, 'accessToken')).toBe('');
    expect(cookieValue(cleared, 'refreshToken')).toBe('');

    const after = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Cookie', cookies)
      .expect(401);
    expect(after.body.error.message).toBe(
      'Your session has been revoked. Please login again.',
    );
  });

  it('logout-all revokes every session', async () => {
    const { email } = await createUser();
    const other = await loginAs(app, email, DEFAULT_PASSWORD);
    const cookies = await loginAs(app, email, DEFAULT_PASSWORD);

    const res = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.message).toBe('Logged out from all devices successfully');

    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', other)
      .expect(401);
  });
});

describe('Google OAuth', () => {
  it('redirects to the frontend with cookies on success', async () => {
    setGoogleProfile(googleProfile());

    const res = await request(app)
      .get('/api/v1/auth/google/callback')
      .expect(302);

    expect(res.headers.location).toBe(`${FRONTEND}/?auth=success`);
    expect(cookieValue(getCookies(res), 'accessToken')).toBeTruthy();
  });

  it('redirects to the login page when Google fails', async () => {
    const res = await request(app)
      .get('/api/v1/auth/google/callback')
      .expect(302);

    expect(res.headers.location).toBe(`${FRONTEND}/login?error=google_failed`);
    expect(getCookies(res)).toHaveLength(0);
  });

  const startMerge = async () => {
    const user = await createUser();
    setGoogleProfile(googleProfile({ id: 'link-google', email: user.email }));
    const res = await request(app)
      .get('/api/v1/auth/google/callback')
      .expect(302);
    const match = /\/auth\/link-account#token=([0-9a-f]{64})$/.exec(
      res.headers.location as string,
    );
    if (!match) throw new Error(`unexpected redirect ${res.headers.location}`);
    return { user, pendingToken: match[1] };
  };

  it('asks to link an existing local account', async () => {
    const { pendingToken } = await startMerge();
    expect(pendingToken).toHaveLength(64);
  });

  it('links the account with the correct password', async () => {
    const { user, pendingToken } = await startMerge();

    const res = await request(app)
      .post('/api/v1/auth/google/link')
      .send({ pendingToken, password: DEFAULT_PASSWORD })
      .expect(200);

    expect(res.body.message).toBe('Google account linked successfully');
    expect(cookieValue(getCookies(res), 'accessToken')).toBeTruthy();
    expect((await userRepository.findById(user.id))?.googleId).toBe(
      'link-google',
    );
  });

  it('rejects an unknown pending token with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google/link')
      .send({ pendingToken: 'f'.repeat(64), password: DEFAULT_PASSWORD })
      .expect(400);
    expect(res.body.error.message).toBe('Token is invalid or expired');
  });

  it('rejects a wrong password with 401', async () => {
    const { pendingToken } = await startMerge();

    const res = await request(app)
      .post('/api/v1/auth/google/link')
      .send({ pendingToken, password: 'Wrong12345' })
      .expect(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('refuses to link a banned account', async () => {
    const { user, pendingToken } = await startMerge();
    await userRepository.updateById(user.id, { status: UserStatus.BANNED });

    await request(app)
      .post('/api/v1/auth/google/link')
      .send({ pendingToken, password: DEFAULT_PASSWORD })
      .expect(401);
    expect((await userRepository.findById(user.id))?.googleId).toBeUndefined();
  });

  it('refuses a Google id already linked to another account', async () => {
    const { pendingToken } = await startMerge();
    const owner = await createUser();
    await userRepository.updateById(owner.id, { googleId: 'link-google' });

    await request(app)
      .post('/api/v1/auth/google/link')
      .send({ pendingToken, password: DEFAULT_PASSWORD })
      .expect(409);
  });
});
