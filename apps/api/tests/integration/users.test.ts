import request from 'supertest';
import { ObjectId } from 'mongodb';
import app from '@/app.js';
import { redis } from '@/config/redis/redis.js';
import { UserRole, UserStatus } from '@mern/shared';
import { userRepository } from '@/repositories/user.repository.js';
import { clearDb, closeTestDb, connectTestDb } from '../helpers/db.js';
import {
  createAdmin,
  createUser,
  DEFAULT_PASSWORD,
} from '../helpers/factories.js';
import { cookieValue, loginAs } from '../helpers/auth.js';

type MockRedis = typeof redis & { __reset: () => void };

beforeAll(connectTestDb);
beforeEach(async () => {
  (redis as MockRedis).__reset();
  await clearDb();
});
afterAll(closeTestDb);

const loginUser = async () => {
  const user = await createUser();
  return { user, cookies: await loginAs(app, user.email, DEFAULT_PASSWORD) };
};

const loginAdmin = async () => {
  const admin = await createAdmin();
  return { admin, cookies: await loginAs(app, admin.email, DEFAULT_PASSWORD) };
};

describe('app', () => {
  it('responds on the root route', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.text).toBe('API is running');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist').expect(404);
    expect(res.body.error.message).toBe('The requested resource was not found');
  });
});

describe('GET /api/v1/user/me', () => {
  it('returns the current user', async () => {
    const { user, cookies } = await loginUser();

    const res = await request(app)
      .get('/api/v1/user/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.data).toMatchObject({ _id: user.id, email: user.email });
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('accepts a bearer token', async () => {
    const { cookies } = await loginUser();
    const token = cookieValue(cookies, 'accessToken');

    await request(app)
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('requires authentication', async () => {
    await request(app).get('/api/v1/user/me').expect(401);
  });
});

describe('GET /api/v1/user', () => {
  it('lets an admin list users without sensitive fields', async () => {
    const { cookies } = await loginAdmin();
    await createUser();

    const res = await request(app)
      .get('/api/v1/user')
      .query({ page: 1, limit: 10 })
      .set('Cookie', cookies)
      .expect(200);

    const { data, meta } = res.body.data as {
      data: Record<string, unknown>[];
      meta: { total: number };
    };
    expect(meta.total).toBe(2);
    expect(data).toHaveLength(2);
    for (const u of data) {
      expect(u).not.toHaveProperty('password');
      expect(u).not.toHaveProperty('googleId');
    }
  });

  it('rejects an invalid query with 422', async () => {
    const { cookies } = await loginAdmin();
    await request(app)
      .get('/api/v1/user')
      .query({ limit: 1000 })
      .set('Cookie', cookies)
      .expect(422);
  });

  it('forbids regular users', async () => {
    const { cookies } = await loginUser();
    await request(app).get('/api/v1/user').set('Cookie', cookies).expect(403);
  });

  it('requires authentication', async () => {
    await request(app).get('/api/v1/user').expect(401);
  });
});

describe('POST /api/v1/user', () => {
  it('no longer exists — registration goes through /auth/register only', async () => {
    await request(app)
      .post('/api/v1/user')
      .send({
        name: 'Bob',
        email: 'bob@example.com',
        password: DEFAULT_PASSWORD,
      })
      .expect(404);

    expect(await userRepository.findByEmail('bob@example.com')).toBeNull();
  });
});

describe('authorization uses the current DB state, not the token', () => {
  it('a demoted admin loses admin access immediately', async () => {
    const { admin, cookies } = await loginAdmin();
    await request(app).get('/api/v1/user').set('Cookie', cookies).expect(200);

    await userRepository.updateById(admin.id, { role: UserRole.USER });
    await request(app).get('/api/v1/user').set('Cookie', cookies).expect(403);
  });

  it.each([
    [UserStatus.BANNED, 'Your account has been banned. Please contact support.'],
    [
      UserStatus.INACTIVE,
      'Your account has been deactivated. Please contact support.',
    ],
  ])('a %s user is locked out of an existing session', async (status, msg) => {
    const { user, cookies } = await loginUser();
    await userRepository.updateById(user.id, { status });

    const res = await request(app)
      .get('/api/v1/user/me')
      .set('Cookie', cookies)
      .expect(401);
    expect(res.body.error.message).toBe(msg);
  });
});

describe('rate limiting on /api/v1/user', () => {
  it('is counted per user, not per IP', async () => {
    const a = await loginUser();
    const b = await loginUser();
    const me = (cookies: string[]) =>
      request(app).get('/api/v1/user/me').set('Cookie', cookies);

    for (let i = 0; i < 10; i++) await me(a.cookies).expect(200);
    await me(a.cookies).expect(429);

    // Same IP, different user → own budget.
    await me(b.cookies).expect(200);
  });

  it('rejects anonymous requests before they reach the limiter', async () => {
    for (let i = 0; i < 12; i++) {
      await request(app).get('/api/v1/user/me').expect(401);
    }
  });
});

describe('/api/v1/user/:id', () => {
  const FORBIDDEN =
    'Access Denied: You do not have permission to modify or access this resource';

  it('lets the owner read, update and delete their profile', async () => {
    const { user, cookies } = await loginUser();
    const url = `/api/v1/user/${user.id}`;

    const got = await request(app).get(url).set('Cookie', cookies).expect(200);
    expect(got.body.data).toMatchObject({ _id: user.id });

    const updated = await request(app)
      .put(url)
      .set('Cookie', cookies)
      .send({ name: 'Renamed', avatar: 'https://example.com/a.png' })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      name: 'Renamed',
      avatar: 'https://example.com/a.png',
    });

    const deleted = await request(app)
      .delete(url)
      .set('Cookie', cookies)
      .expect(200);
    expect(deleted.body.data).toEqual({ id: user.id });
    expect(await userRepository.findById(user.id)).toBeNull();
  });

  it('revokes the sessions of a deleted user', async () => {
    const { user, cookies } = await loginUser();
    await request(app)
      .delete(`/api/v1/user/${user.id}`)
      .set('Cookie', cookies)
      .expect(200);

    const res = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Cookie', cookies)
      .expect(401);
    expect(res.body.error.message).toBe(
      'Your session has been revoked. Please login again.',
    );
  });

  it('rejects an invalid update body with 422', async () => {
    const { user, cookies } = await loginUser();
    await request(app)
      .put(`/api/v1/user/${user.id}`)
      .set('Cookie', cookies)
      .send({ avatar: 'not-a-url' })
      .expect(422);
    await request(app)
      .put(`/api/v1/user/${user.id}`)
      .set('Cookie', cookies)
      .send({ avatar: 'javascript:alert(1)' })
      .expect(422);
  });

  it('rejects a malformed id with 422', async () => {
    const { cookies } = await loginAdmin();
    await request(app)
      .get('/api/v1/user/not-an-id')
      .set('Cookie', cookies)
      .expect(422);
  });

  it("forbids access to another user's profile", async () => {
    const { cookies } = await loginUser();
    const other = await createUser();
    const url = `/api/v1/user/${other.id}`;

    const res = await request(app).get(url).set('Cookie', cookies).expect(403);
    expect(res.body.error.message).toBe(FORBIDDEN);
    await request(app)
      .put(url)
      .set('Cookie', cookies)
      .send({ name: 'Hacked' })
      .expect(403);
    await request(app).delete(url).set('Cookie', cookies).expect(403);

    expect((await userRepository.findById(other.id))?.name).toBe(other.name);
  });

  it('lets an admin manage other users', async () => {
    const { cookies } = await loginAdmin();
    const other = await createUser();
    const url = `/api/v1/user/${other.id}`;

    await request(app).get(url).set('Cookie', cookies).expect(200);
    await request(app)
      .put(url)
      .set('Cookie', cookies)
      .send({ name: 'By Admin' })
      .expect(200);
    await request(app).delete(url).set('Cookie', cookies).expect(200);
  });

  it('returns 404 for an unknown id', async () => {
    const { cookies } = await loginAdmin();
    const res = await request(app)
      .get(`/api/v1/user/${new ObjectId().toString()}`)
      .set('Cookie', cookies)
      .expect(404);
    expect(res.body.error.message).toBe("User don't exist");
  });

  it('requires authentication', async () => {
    const user = await createUser();
    await request(app).get(`/api/v1/user/${user.id}`).expect(401);
  });
});
