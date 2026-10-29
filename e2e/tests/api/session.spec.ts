import {
  request as newRequest,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';
import { ADMIN_URL, API_URL } from '../../env';
import { cookieValue } from '../../support/cookies';
import {
  PASSWORD,
  SUBJECT,
  expect,
  otpFrom,
  test,
} from '../../support/fixtures';

const bearer = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

const setsCookies = (res: APIResponse) =>
  res.headersArray().some((h) => h.name.toLowerCase() === 'set-cookie');

test('login sets HttpOnly cookies and returns no tokens in the body', async ({
  createUser,
  request,
}) => {
  const user = await createUser();
  const res = await request.post('/api/v1/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(res.status()).toBe(200);

  const body = await res.text();
  expect(body).not.toContain('eyJ');
  expect(body).not.toContain('password');

  const setCookie = res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value);
  const access = setCookie.find((c) => c.startsWith('accessToken='));
  const refresh = setCookie.find((c) => c.startsWith('refreshToken='));
  expect(access).toMatch(/HttpOnly/i);
  expect(access).toMatch(/SameSite=Lax/i);
  expect(access).toMatch(/Path=\/(;|$)/);
  expect(refresh).toMatch(/HttpOnly/i);
  expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
});

test('wrong credentials are rejected without setting cookies', async ({
  createUser,
  request,
}) => {
  const user = await createUser();
  for (const data of [
    { email: user.email, password: 'WrongPass123' },
    { email: 'nobody@example.test', password: PASSWORD },
  ]) {
    const res = await request.post('/api/v1/auth/login', { data });
    expect(res.status()).toBe(401);
    expect(setsCookies(res)).toBe(false);
  }
});

test('an unverified account cannot log in', async ({ createUser, request }) => {
  const user = await createUser({ verified: false });
  const login = (password: string) =>
    request.post('/api/v1/auth/login', {
      data: { email: user.email, password },
    });

  const res = await login(user.password);
  expect(res.status()).toBe(403);
  expect(setsCookies(res)).toBe(false);

  // A wrong password must not learn that the account exists but is unverified.
  expect((await login('WrongPass123')).status()).toBe(401);
});

test('refresh rotates cookies and returns no tokens in the body', async ({
  createUser,
  apiLogin,
}) => {
  const api = await apiLogin(await createUser());
  const before = await cookieValue(api, 'refreshToken');

  const res = await api.post('/api/v1/auth/refresh');
  expect(res.status()).toBe(200);
  expect(await res.text()).not.toContain('eyJ');
  expect((await res.json()).data).toBeNull();
  expect(await cookieValue(api, 'refreshToken')).not.toBe(before);
  expect((await api.get('/api/v1/user/me')).status()).toBe(200);
});

test('logout revokes both the access and the refresh token', async ({
  createUser,
  apiLogin,
}) => {
  const api = await apiLogin(await createUser());
  const access = await cookieValue(api, 'accessToken');
  const refresh = await cookieValue(api, 'refreshToken');

  expect((await api.post('/api/v1/auth/logout')).status()).toBe(200);

  // Replay the captured tokens from a clean context, as a thief would.
  const thief = await newRequest.newContext({ baseURL: API_URL });
  expect(
    (await thief.get('/api/v1/user/me', bearer(access))).status(),
  ).toBe(401);
  expect(
    (
      await thief.post('/api/v1/auth/refresh', {
        data: { refreshToken: refresh },
      })
    ).status(),
  ).toBe(401);
  await thief.dispose();
});

test('reusing a rotated refresh token revokes the whole session family', async ({
  createUser,
  apiLogin,
}) => {
  const api = await apiLogin(await createUser());
  const stolen = await cookieValue(api, 'refreshToken');

  // Legitimate rotation.
  expect((await api.post('/api/v1/auth/refresh')).status()).toBe(200);
  expect(await cookieValue(api, 'refreshToken')).not.toBe(stolen);
  expect((await api.get('/api/v1/user/me')).status()).toBe(200);

  // Attacker replays the old token → rejected, and the victim's new session dies too.
  const thief = await newRequest.newContext({ baseURL: API_URL });
  expect(
    (
      await thief.post('/api/v1/auth/refresh', {
        data: { refreshToken: stolen },
      })
    ).status(),
  ).toBe(401);
  await thief.dispose();

  expect((await api.get('/api/v1/user/me')).status()).toBe(401);
  expect((await api.post('/api/v1/auth/refresh')).status()).toBe(401);
});

test.describe('password reset', () => {
  test('a valid OTP resets the password and kills existing sessions', async ({
    createUser,
    apiLogin,
    waitForEmail,
    request,
  }) => {
    const user = await createUser();
    const session = await apiLogin(user);

    await request.post('/api/v1/auth/forgot-password', {
      data: { email: user.email },
    });
    const mail = await waitForEmail(user.email, SUBJECT.reset);
    const res = await request.post('/api/v1/auth/reset-password', {
      data: { email: user.email, otp: otpFrom(mail), newPassword: 'NewPass456' },
    });
    expect(res.status()).toBe(200);

    expect((await session.get('/api/v1/user/me')).status()).toBe(401);
    const login = (password: string) =>
      request.post('/api/v1/auth/login', {
        data: { email: user.email, password },
      });
    expect((await login(PASSWORD)).status()).toBe(401);
    expect((await login('NewPass456')).status()).toBe(200);
  });

  test('an OTP can only be used once', async ({
    createUser,
    waitForEmail,
    request,
  }) => {
    const user = await createUser();
    await request.post('/api/v1/auth/forgot-password', {
      data: { email: user.email },
    });
    const otp = otpFrom(await waitForEmail(user.email, SUBJECT.reset));
    const reset = (newPassword: string) =>
      request.post('/api/v1/auth/reset-password', {
        data: { email: user.email, otp, newPassword },
      });

    expect((await reset('NewPass456')).status()).toBe(200);
    expect((await reset('Another789')).status()).toBe(400);
  });

  test('OTP brute force is capped: after 5 misses the real OTP stops working', async ({
    createUser,
    waitForEmail,
    request,
  }) => {
    const user = await createUser();
    await request.post('/api/v1/auth/forgot-password', {
      data: { email: user.email },
    });
    const otp = otpFrom(await waitForEmail(user.email, SUBJECT.reset));
    const wrong = otp === '000000' ? '111111' : '000000';
    const reset = (code: string) =>
      request.post('/api/v1/auth/reset-password', {
        data: { email: user.email, otp: code, newPassword: 'NewPass456' },
      });

    for (let i = 0; i < 5; i++) expect((await reset(wrong)).status()).toBe(400);
    expect((await reset(otp)).status()).toBe(400);

    const login = await request.post('/api/v1/auth/login', {
      data: { email: user.email, password: PASSWORD },
    });
    expect(login.status()).toBe(200);
  });

  test('forgot-password does not reveal whether an email exists', async ({
    createUser,
    emailsTo,
    request,
  }) => {
    const user = await createUser();
    const ask = async (email: string) => {
      const res = await request.post('/api/v1/auth/forgot-password', {
        data: { email },
      });
      return { status: res.status(), body: (await res.json()).message };
    };

    const known = await ask(user.email);
    const unknown = await ask('nobody@example.test');
    expect(unknown).toEqual(known);
    expect(await emailsTo('nobody@example.test')).toHaveLength(0);
    expect(await emailsTo(user.email, SUBJECT.reset)).toHaveLength(1);
  });

  test('reset-password does not reveal whether an email exists', async ({
    createUser,
    waitForEmail,
    request,
  }) => {
    const user = await createUser();
    await request.post('/api/v1/auth/forgot-password', {
      data: { email: user.email },
    });
    const otp = otpFrom(await waitForEmail(user.email, SUBJECT.reset));
    const wrong = otp === '000000' ? '111111' : '000000';
    const reset = async (email: string) => {
      const res = await request.post('/api/v1/auth/reset-password', {
        data: { email, otp: wrong, newPassword: 'NewPass456' },
      });
      return { status: res.status(), message: (await res.json()).error.message };
    };

    const known = await reset(user.email);
    expect(known.status).toBe(400);
    // Same answer every time, including past the attempt cap.
    for (let i = 0; i < 6; i++) {
      expect(await reset('nobody@example.test')).toEqual(known);
    }
  });
});

test.describe('CORS', () => {
  const preflight = async (request: APIRequestContext, origin: string) =>
    (
      await request.fetch('/api/v1/auth/login', {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
      })
    ).headers();

  test('the admin app may make credentialed requests', async ({ request }) => {
    const headers = await preflight(request, ADMIN_URL);
    expect(headers['access-control-allow-origin']).toBe(ADMIN_URL);
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('an unknown origin is not allowed', async ({ request }) => {
    const headers = await preflight(request, 'https://evil.example');
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });
});
