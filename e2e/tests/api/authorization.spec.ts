import { ObjectId } from 'mongodb';
import { cookieValue } from '../../support/cookies';
import { PASSWORD, expect, test, uniqueEmail } from '../../support/fixtures';

test.describe('authentication is required', () => {
  test('protected endpoints reject anonymous requests', async ({ request }) => {
    expect((await request.get('/api/v1/user/me')).status()).toBe(401);
    expect((await request.get('/api/v1/user')).status()).toBe(401);
    expect((await request.get('/api/v1/auth/sessions')).status()).toBe(401);
  });

  test('a tampered or unsigned access token is rejected', async ({
    createUser,
    apiLogin,
    request,
  }) => {
    const user = await createUser();
    const token = await cookieValue(await apiLogin(user), 'accessToken');
    const [header, payload, signature] = token.split('.');

    // Escalate role in the payload but keep the original signature.
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const forged = Buffer.from(
      JSON.stringify({ ...claims, role: 'admin' }),
    ).toString('base64url');
    const none = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');

    for (const bad of [
      `${header}.${forged}.${signature}`,
      `${none}.${forged}.`,
      `${header}.${payload}.${signature.slice(0, -4)}AAAA`,
    ]) {
      const res = await request.get('/api/v1/user', {
        headers: { Authorization: `Bearer ${bad}` },
      });
      expect(res.status()).toBe(401);
    }
  });
});

test.describe('ownership (IDOR)', () => {
  test('a user cannot read, update or delete another user', async ({
    createUser,
    apiLogin,
    db,
  }) => {
    const victim = await createUser();
    const attacker = await apiLogin(await createUser());
    const url = `/api/v1/user/${victim.id}`;

    expect((await attacker.get(url)).status()).toBe(403);
    expect(
      (await attacker.put(url, { data: { name: 'Hacked' } })).status(),
    ).toBe(403);
    expect((await attacker.delete(url)).status()).toBe(403);

    const stored = await db
      .collection('users')
      .findOne({ _id: new ObjectId(victim.id) });
    expect(stored?.name).toBe(victim.name);
  });

  test('a user can read and update their own profile without leaking secrets', async ({
    createUser,
    apiLogin,
  }) => {
    const user = await createUser();
    const api = await apiLogin(user);

    const me = await (await api.get('/api/v1/user/me')).json();
    expect(me.data.email).toBe(user.email);
    expect(me.data).not.toHaveProperty('password');
    expect(me.data).not.toHaveProperty('googleId');

    const res = await api.put(`/api/v1/user/${user.id}`, {
      data: { name: 'Renamed' },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.name).toBe('Renamed');
  });

  test('only admins can list users', async ({ createUser, apiLogin }) => {
    const user = await apiLogin(await createUser());
    expect((await user.get('/api/v1/user')).status()).toBe(403);

    const admin = await apiLogin(await createUser({ role: 'admin' }));
    const res = await admin.get('/api/v1/user');
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
    for (const u of data.data) expect(u).not.toHaveProperty('password');
  });
});

test.describe('authorization follows the DB, not the token', () => {
  test('a demoted admin loses admin access on the same session', async ({
    createUser,
    apiLogin,
    db,
  }) => {
    const admin = await createUser({ role: 'admin' });
    const api = await apiLogin(admin);
    expect((await api.get('/api/v1/user')).status()).toBe(200);

    await db
      .collection('users')
      .updateOne({ _id: new ObjectId(admin.id) }, { $set: { role: 'user' } });
    expect((await api.get('/api/v1/user')).status()).toBe(403);
  });

  test('a banned user is locked out of an existing session', async ({
    createUser,
    apiLogin,
    db,
  }) => {
    const user = await createUser();
    const api = await apiLogin(user);
    expect((await api.get('/api/v1/user/me')).status()).toBe(200);

    await db
      .collection('users')
      .updateOne({ _id: new ObjectId(user.id) }, { $set: { status: 'banned' } });
    expect((await api.get('/api/v1/user/me')).status()).toBe(401);
  });
});

test.describe('mass assignment', () => {
  test('profile update ignores privileged fields', async ({
    createUser,
    apiLogin,
    db,
  }) => {
    const user = await createUser();
    const api = await apiLogin(user);
    // Unverified accounts cannot log in, so un-verify after the session exists.
    await db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(user.id) },
        { $set: { isEmailVerified: false } },
      );

    await api.put(`/api/v1/user/${user.id}`, {
      data: {
        name: 'Still User',
        role: 'admin',
        isEmailVerified: true,
        status: 'active',
        email: 'other@example.test',
      },
    });

    const stored = await db
      .collection('users')
      .findOne({ _id: new ObjectId(user.id) });
    expect(stored).toMatchObject({
      name: 'Still User',
      role: 'user',
      isEmailVerified: false,
      email: user.email,
    });
  });

  test('registration ignores privileged fields', async ({ request, db }) => {
    const email = uniqueEmail();
    const res = await request.post('/api/v1/auth/register', {
      data: {
        name: 'Sneaky',
        email,
        password: PASSWORD,
        role: 'admin',
        isEmailVerified: true,
      },
    });
    expect(res.status()).toBe(201);

    const stored = await db.collection('users').findOne({ email });
    expect(stored).toMatchObject({ role: 'user', isEmailVerified: false });
  });

  test('there is no public user-creation endpoint besides register', async ({
    request,
    db,
  }) => {
    const email = uniqueEmail();
    const res = await request.post('/api/v1/user', {
      data: { name: 'Bypass', email, password: PASSWORD },
    });
    expect(res.status()).toBe(404);
    expect(await db.collection('users').findOne({ email })).toBeNull();
  });
});
