import type { Page } from '@playwright/test';
import {
  PASSWORD,
  SUBJECT,
  expect,
  otpFrom,
  test,
  uniqueEmail,
  verifyLinkFrom,
} from '../../support/fixtures';

const fillLogin = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
};

test('protected pages redirect anonymous visitors to login', async ({
  page,
}) => {
  for (const path of ['/', '/profile/me/set-password']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('register → verify email → login → logout', async ({
  page,
  waitForEmail,
  db,
}) => {
  const email = uniqueEmail();

  await page.goto('/register');
  await page.getByLabel('Tên', { exact: true }).fill('Alice');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(
    page.getByRole('heading', { name: 'Kiểm tra email của bạn' }),
  ).toBeVisible();

  const mail = await waitForEmail(email, SUBJECT.verify);
  await page.goto(verifyLinkFrom(mail));
  await expect(page).toHaveURL(/\/login\?verified=true$/);
  await expect(
    page.getByText('Email đã được xác minh. Bạn có thể đăng nhập.'),
  ).toBeVisible();
  expect(await db.collection('users').findOne({ email })).toMatchObject({
    isEmailVerified: true,
  });

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Xin chào, Alice!')).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('tokens live only in HttpOnly cookies, never in JS-readable storage', async ({
  page,
  context,
  createUser,
}) => {
  const user = await createUser();
  await fillLogin(page, user.email, user.password);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const cookies = await context.cookies();
  const access = cookies.find((c) => c.name === 'accessToken');
  const refresh = cookies.find((c) => c.name === 'refreshToken');
  expect(access).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  expect(refresh).toMatchObject({ httpOnly: true, path: '/api/v1/auth' });

  const exposed = await page.evaluate(() =>
    [
      document.cookie,
      JSON.stringify({ ...localStorage }),
      JSON.stringify({ ...sessionStorage }),
    ].join('\n'),
  );
  expect(exposed).not.toContain('eyJ');
  expect(exposed).not.toContain(access!.value);
});

test('an unverified account is told to verify and gets no session', async ({
  page,
  context,
  createUser,
}) => {
  const user = await createUser({ verified: false });
  await fillLogin(page, user.email, user.password);

  await expect(page.getByText('Email chưa được xác minh.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await context.cookies()).toHaveLength(0);
});

test('an unverified account can resend the verification email, verify and log in', async ({
  page,
  request,
  createUser,
  emailsTo,
  waitForEmail,
}) => {
  const user = await createUser({ verified: false });
  // Register's email is fire-and-forget; wait for it so the resend is the newest.
  const first = await waitForEmail(user.email, SUBJECT.verify);
  await fillLogin(page, user.email, user.password);

  await page.getByRole('button', { name: 'Gửi lại email xác minh' }).click();
  await expect(page.getByText('Đã gửi lại email xác minh.')).toBeVisible();

  let mails: Awaited<ReturnType<typeof emailsTo>> = [];
  await expect
    .poll(async () => (mails = await emailsTo(user.email, SUBJECT.verify)).length)
    .toBe(2);

  // The resend revokes the previous link.
  const old = await request.get(verifyLinkFrom(first), { maxRedirects: 0 });
  expect(old.status()).toBe(400);

  await page.goto(verifyLinkFrom(mails.at(-1)!));
  await expect(page).toHaveURL(/\/login\?verified=true$/);

  await fillLogin(page, user.email, user.password);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('wrong password shows an error and sets no session', async ({
  page,
  context,
  createUser,
}) => {
  const user = await createUser();
  await fillLogin(page, user.email, 'WrongPass123');

  await expect(
    page.getByText('Đăng nhập thất bại. Vui lòng kiểm tra lại.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await context.cookies()).toHaveLength(0);
});

test.describe('password reset', () => {
  test('OTP from email resets the password and signs out other sessions', async ({
    page,
    createUser,
    apiLogin,
    waitForEmail,
  }) => {
    const user = await createUser();
    const otherDevice = await apiLogin(user);
    const newPassword = 'NewPass456';

    await page.goto('/forgot-password');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await expect(
      page.getByRole('heading', { name: 'Kiểm tra email của bạn' }),
    ).toBeVisible();

    const mail = await waitForEmail(user.email, SUBJECT.reset);
    await page.getByRole('link', { name: 'Nhập mã OTP' }).click();
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Mã OTP', { exact: true }).fill(otpFrom(mail));
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill(newPassword);
    await page
      .getByLabel('Xác nhận mật khẩu mới', { exact: true })
      .fill(newPassword);
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await expect(
      page.getByRole('heading', { name: 'Đặt lại mật khẩu thành công' }),
    ).toBeVisible();

    expect((await otherDevice.get('/api/v1/user/me')).status()).toBe(401);

    await fillLogin(page, user.email, PASSWORD);
    await expect(
      page.getByText('Đăng nhập thất bại. Vui lòng kiểm tra lại.'),
    ).toBeVisible();
    await fillLogin(page, user.email, newPassword);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('a wrong OTP is rejected', async ({ page, createUser, request }) => {
    const user = await createUser();
    // The web project's request fixture targets the web origin → goes through the Vite proxy.
    await request.post('/api/v1/auth/forgot-password', {
      data: { email: user.email },
    });

    await page.goto('/reset-password');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Mã OTP', { exact: true }).fill('000000');
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPass456');
    await page
      .getByLabel('Xác nhận mật khẩu mới', { exact: true })
      .fill('NewPass456');
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await expect(
      page.getByText('Mã OTP không hợp lệ hoặc đã hết hạn.'),
    ).toBeVisible();
  });

  test('an unknown email gets the same response and no email is sent', async ({
    page,
    emailsTo,
  }) => {
    const email = uniqueEmail();
    await page.goto('/forgot-password');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await expect(
      page.getByRole('heading', { name: 'Kiểm tra email của bạn' }),
    ).toBeVisible();
    expect(await emailsTo(email)).toHaveLength(0);
  });
});
