import type { Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { expect, test, type TestUser } from '../../support/fixtures';

const login = async (page: Page, user: TestUser) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
};

const rowOf = (page: Page, email: string) =>
  page.getByRole('row').filter({ hasText: email });

test('anonymous visitors are sent to login', async ({ page }) => {
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Chỉ dành cho tài khoản quản trị.')).toBeVisible();
});

test('a non-admin account gets 403 and sees no user data', async ({
  page,
  createUser,
}) => {
  const user = await createUser();
  const other = await createUser();
  await login(page, user);

  await expect(page.getByRole('heading', { name: '403' })).toBeVisible();
  await expect(
    page.getByText(
      `Tài khoản ${user.email} không có quyền truy cập trang quản trị.`,
    ),
  ).toBeVisible();
  await expect(page.getByText(other.email)).toHaveCount(0);

  // The guard is not just cosmetic: the API itself refuses the session.
  expect((await page.request.get('/api/v1/user')).status()).toBe(403);

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('wrong credentials show an error', async ({ page, createUser }) => {
  const admin = await createUser({ role: 'admin' });
  await login(page, { ...admin, password: 'WrongPass123' });
  await expect(
    page.getByText('Đăng nhập thất bại. Vui lòng kiểm tra lại.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test.describe('as admin', () => {
  test('lists and searches users', async ({ page, createUser, db }) => {
    const admin = await createUser({ role: 'admin' });
    const alice = await createUser();
    await db
      .collection('users')
      .updateOne({ email: alice.email }, { $set: { name: 'Alice Search' } });
    const bob = await createUser();

    await login(page, admin);
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('heading', { name: 'Người dùng' })).toBeVisible();
    await expect(page.getByText('3 tài khoản')).toBeVisible();

    await page.getByPlaceholder('Tìm theo tên hoặc email').fill('Alice');
    await page.getByRole('button', { name: 'Tìm' }).click();
    await expect(page.getByText('1 tài khoản')).toBeVisible();
    await expect(rowOf(page, alice.email)).toBeVisible();
    await expect(rowOf(page, bob.email)).toHaveCount(0);

    await page.getByPlaceholder('Tìm theo tên hoặc email').fill('no-such-user');
    await page.getByRole('button', { name: 'Tìm' }).click();
    await expect(page.getByText('Không có người dùng nào.')).toBeVisible();
  });

  test('deletes another user after confirmation', async ({
    page,
    createUser,
    db,
  }) => {
    const admin = await createUser({ role: 'admin' });
    const victim = await createUser();
    await login(page, admin);

    const row = rowOf(page, victim.email);
    await expect(row).toBeVisible();

    // Dismissing the confirm must not delete anything.
    page.once('dialog', (d) => d.dismiss());
    await row.getByRole('button', { name: 'Xóa' }).click();
    await expect(row).toBeVisible();

    page.once('dialog', (d) => {
      expect(d.message()).toBe(`Xóa người dùng ${victim.email}?`);
      return d.accept();
    });
    await row.getByRole('button', { name: 'Xóa' }).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByText('1 tài khoản')).toBeVisible();

    expect(
      await db.collection('users').findOne({ _id: new ObjectId(victim.id) }),
    ).toBeNull();
  });

  test('cannot delete their own account from the list', async ({
    page,
    createUser,
  }) => {
    const admin = await createUser({ role: 'admin' });
    await createUser();
    await login(page, admin);

    await expect(
      rowOf(page, admin.email).getByRole('button', { name: 'Xóa' }),
    ).toBeDisabled();
  });
});
