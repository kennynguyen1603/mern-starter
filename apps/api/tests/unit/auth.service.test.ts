import { AuthProvider, UserStatus } from '@mern/shared';
import { authService } from '@/services/auth.service.js';
import { userService } from '@/services/user.service.js';
import { jwtService } from '@/services/jwt.service.js';
import { userRepository } from '@/repositories/user.repository.js';
import { tokenRepository } from '@/repositories/token.repository.js';
import { ErrorResponse } from '@/core/error.response.js';
import { redis } from '@/config/redis/redis.js';
import { clearDb, closeTestDb, connectTestDb } from '../helpers/db.js';
import { createUser, DEFAULT_PASSWORD } from '../helpers/factories.js';
import { googleProfile } from '../helpers/fakeGoogle.js';
import { emailService } from '@/services/email.service.js';

type MockRedis = typeof redis & { __reset: () => void };

const expectRejection = async (
  promise: Promise<unknown>,
  status: number,
  message: string,
) => {
  const err = await promise.then(
    () => {
      throw new Error('expected promise to reject');
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ErrorResponse);
  expect((err as ErrorResponse).status).toBe(status);
  expect((err as ErrorResponse).message).toBe(message);
};

beforeAll(connectTestDb);
beforeEach(async () => {
  (redis as MockRedis).__reset();
  await clearDb();
});
afterAll(closeTestDb);

describe('authService.register', () => {
  it('creates a local user without leaking the password', async () => {
    const user = await authService.register({
      name: 'Alice',
      email: 'Alice@Example.com',
      password: DEFAULT_PASSWORD,
    });

    expect(user.email).toBe('alice@example.com');
    expect(user).not.toHaveProperty('password');
    expect(user.providers).toEqual([AuthProvider.LOCAL]);
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser({ email: 'dup@example.com' });
    await expectRejection(
      authService.register({
        name: 'Dup',
        email: 'dup@example.com',
        password: DEFAULT_PASSWORD,
      }),
      409,
      'Email have been already used.',
    );
  });
});

describe('authService.login', () => {
  it('returns the user and a token pair for valid credentials', async () => {
    const { id, email } = await createUser();
    const result = await authService.login({
      email,
      password: DEFAULT_PASSWORD,
    });

    expect(result.user._id).toBe(id);
    const payload = jwtService.verifyAccessToken(result.tokens.accessToken);
    expect(payload).toMatchObject({ userId: id });
    expect(
      jwtService.verifyRefreshToken(result.tokens.refreshToken),
    ).toMatchObject({ userId: id });
  });

  it('rejects an unknown email', async () => {
    await expectRejection(
      authService.login({ email: 'nobody@example.com', password: 'x' }),
      401,
      'Invalid email or password',
    );
  });

  it('rejects a wrong password', async () => {
    const { email } = await createUser();
    await expectRejection(
      authService.login({ email, password: 'Wrong12345' }),
      401,
      'Invalid email or password',
    );
  });

  it.each([
    [
      UserStatus.INACTIVE,
      'Your account has been deactivated. Please contact support.',
    ],
    [
      UserStatus.BANNED,
      'Your account has been banned. Please contact support.',
    ],
  ])('rejects a %s account', async (status, message) => {
    const { id, email } = await createUser();
    await userRepository.updateById(id, { status });
    await expectRejection(
      authService.login({ email, password: DEFAULT_PASSWORD }),
      401,
      message,
    );
  });

  it('rejects an unverified email with 403 only after the password matches', async () => {
    const { email } = await createUser({ verified: false });
    await expectRejection(
      authService.login({ email, password: DEFAULT_PASSWORD }),
      403,
      'Please verify your email before logging in.',
    );
    // A wrong password must not reveal the verification state
    await expectRejection(
      authService.login({ email, password: 'Wrong12345' }),
      401,
      'Invalid email or password',
    );
  });

  it('keeps "+" in the address and matches case-insensitively', async () => {
    const { id, email } = await createUser({ email: 'Bob+Tag@Example.com' });
    expect(email).toBe('bob+tag@example.com');

    const result = await authService.login({
      email: 'BOB+tag@example.com',
      password: DEFAULT_PASSWORD,
    });
    expect(result.user._id).toBe(id);
  });

  it('rejects password login for a Google-only account', async () => {
    await userService.createGoogleUser({
      googleId: 'g-1',
      email: 'g@example.com',
      name: 'G',
    });
    await expectRejection(
      authService.login({ email: 'g@example.com', password: DEFAULT_PASSWORD }),
      401,
      'This account uses Google login. Please sign in with Google.',
    );
  });
});

describe('authService.refreshTokens', () => {
  it('rotates the refresh token and rejects the old one', async () => {
    const { email } = await createUser();
    const { tokens } = await authService.login({
      email,
      password: DEFAULT_PASSWORD,
    });

    const rotated = await authService.refreshTokens(tokens.refreshToken);
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);

    await expectRejection(
      authService.refreshTokens(tokens.refreshToken),
      401,
      'Refresh token is invalid or expired',
    );
  });

  it('revokes every session when a rotated token is reused', async () => {
    const { id, email } = await createUser();
    const { tokens } = await authService.login({
      email,
      password: DEFAULT_PASSWORD,
    });
    await authService.login({ email, password: DEFAULT_PASSWORD });
    await authService.refreshTokens(tokens.refreshToken);
    expect(await authService.getActiveSessions(id)).toHaveLength(2);

    await expect(
      authService.refreshTokens(tokens.refreshToken),
    ).rejects.toThrow();

    expect(await authService.getActiveSessions(id)).toHaveLength(0);
  });

  it('rejects a malformed token', async () => {
    await expectRejection(
      authService.refreshTokens('not-a-jwt'),
      401,
      'Refresh token is invalid or expired',
    );
  });

  it('rejects refresh for a banned account', async () => {
    const { id, email } = await createUser();
    const { tokens } = await authService.login({
      email,
      password: DEFAULT_PASSWORD,
    });
    await userRepository.updateById(id, { status: UserStatus.BANNED });

    await expectRejection(
      authService.refreshTokens(tokens.refreshToken),
      401,
      'Your account has been banned. Please contact support.',
    );
  });
});

describe('authService.logout', () => {
  it('revokes and blacklists the session', async () => {
    const { id, email } = await createUser();
    const { tokens } = await authService.login({
      email,
      password: DEFAULT_PASSWORD,
    });
    const payload = jwtService.verifyRefreshToken(tokens.refreshToken)!;

    await authService.logout(tokens.refreshToken);

    expect(await authService.getActiveSessions(id)).toHaveLength(0);
    expect(await tokenRepository.isSessionBlacklisted(payload.sessionId)).toBe(
      true,
    );
  });

  it('ignores an invalid token', async () => {
    await expect(authService.logout('garbage')).resolves.toBeUndefined();
  });

  it('logoutAll revokes every session of the user', async () => {
    const { id, email } = await createUser();
    await authService.login({ email, password: DEFAULT_PASSWORD });
    await authService.login({ email, password: DEFAULT_PASSWORD });

    await authService.logoutAll(id);

    expect(await authService.getActiveSessions(id)).toHaveLength(0);
  });
});

describe('authService.handleGoogleCallback', () => {
  it('logs in a returning Google user', async () => {
    const existing = await userService.createGoogleUser({
      googleId: 'google-id-123',
      email: 'google.user@example.com',
      name: 'Google User',
    });

    const result = await authService.handleGoogleCallback(googleProfile());

    expect(result.type).toBe('success');
    if (result.type !== 'success') return;
    expect(result.user._id).toBe(existing._id.toString());
    expect(result.tokens.accessToken).toEqual(expect.any(String));
  });

  it('requires linking when the email belongs to a local account', async () => {
    const { email } = await createUser();

    const result = await authService.handleGoogleCallback(
      googleProfile({ email }),
    );

    expect(result.type).toBe('merge_required');
    if (result.type !== 'merge_required') return;
    expect(result.pendingToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches an existing local account regardless of email case', async () => {
    await createUser({ email: 'mixed@example.com' });

    const result = await authService.handleGoogleCallback(
      googleProfile({ id: 'g-mixed', email: 'Mixed@Example.COM' }),
    );

    expect(result.type).toBe('merge_required');
  });

  it('creates a new Google user', async () => {
    const result = await authService.handleGoogleCallback(
      googleProfile({ id: 'new-google', email: 'new@example.com' }),
    );

    expect(result.type).toBe('success');
    const user = await userRepository.findByGoogleId('new-google');
    expect(user).toMatchObject({
      email: 'new@example.com',
      providers: [AuthProvider.GOOGLE],
      isEmailVerified: true,
    });
    expect(user?.password).toBeUndefined();
  });

  it('rejects a profile without email', async () => {
    await expectRejection(
      authService.handleGoogleCallback({ ...googleProfile(), emails: [] }),
      400,
      'Google account must have a valid email',
    );
  });

  it('rejects a banned returning Google user', async () => {
    const existing = await userService.createGoogleUser({
      googleId: 'google-id-123',
      email: 'google.user@example.com',
      name: 'Google User',
    });
    await userRepository.updateById(existing._id.toString(), {
      status: UserStatus.BANNED,
    });

    await expectRejection(
      authService.handleGoogleCallback(googleProfile()),
      401,
      'Your account has been banned. Please contact support.',
    );
  });
});

describe('authService.linkGoogleAccount', () => {
  const startMerge = async () => {
    const user = await createUser();
    const result = await authService.handleGoogleCallback(
      googleProfile({ id: 'link-google', email: user.email }),
    );
    if (result.type !== 'merge_required') throw new Error('expected merge');
    return { user, pendingToken: result.pendingToken };
  };

  it('links Google to the local account with the correct password', async () => {
    const { user, pendingToken } = await startMerge();

    const result = await authService.linkGoogleAccount(
      pendingToken,
      DEFAULT_PASSWORD,
    );

    expect(result.user._id).toBe(user.id);
    expect(result.user.providers).toEqual([
      AuthProvider.LOCAL,
      AuthProvider.GOOGLE,
    ]);
    expect((await userRepository.findById(user.id))?.googleId).toBe(
      'link-google',
    );
  });

  it('consumes the pending token', async () => {
    const { pendingToken } = await startMerge();
    await authService.linkGoogleAccount(pendingToken, DEFAULT_PASSWORD);

    await expectRejection(
      authService.linkGoogleAccount(pendingToken, DEFAULT_PASSWORD),
      400,
      'Token is invalid or expired',
    );
  });

  it('rejects an unknown pending token', async () => {
    await expectRejection(
      authService.linkGoogleAccount('f'.repeat(64), DEFAULT_PASSWORD),
      400,
      'Token is invalid or expired',
    );
  });

  it('rejects a wrong password and keeps the account unlinked', async () => {
    const { user, pendingToken } = await startMerge();

    await expectRejection(
      authService.linkGoogleAccount(pendingToken, 'Wrong12345'),
      401,
      'Invalid email or password',
    );
    expect((await userRepository.findById(user.id))?.googleId).toBeUndefined();
  });
});

describe('authService password reset', () => {
  const INVALID_OTP = 'Token is invalid or expired';
  const sendOtp = emailService.sendPasswordResetOTP as jest.Mock;
  const lastOtp = () => sendOtp.mock.calls.at(-1)![1] as string;
  const wrongOtp = (otp: string) => (otp === '000000' ? '111111' : '000000');

  beforeEach(() => sendOtp.mockClear());

  it('resets the password with the emailed OTP', async () => {
    const { email } = await createUser();
    await authService.forgotPassword(email);

    await authService.resetPassword(email, lastOtp(), 'NewPassword123');

    await expect(
      authService.login({ email, password: 'NewPassword123' }),
    ).resolves.toBeDefined();
  });

  it('does not reset the attempt counter when a new OTP is requested', async () => {
    const { email } = await createUser();
    await authService.forgotPassword(email);
    for (let i = 0; i < 5; i++) {
      await expectRejection(
        authService.resetPassword(email, wrongOtp(lastOtp()), 'NewPassword123'),
        400,
        INVALID_OTP,
      );
    }

    await authService.forgotPassword(email);
    await expectRejection(
      authService.resetPassword(email, lastOtp(), 'NewPassword123'),
      400,
      INVALID_OTP,
    );
  });

  it('answers an unknown email exactly like a wrong OTP', async () => {
    await expectRejection(
      authService.resetPassword('nobody@example.com', '123456', 'NewPassword123'),
      400,
      INVALID_OTP,
    );
  });

  it('counts attempts against an unknown email too', async () => {
    const email = 'nobody@example.com';
    for (let i = 0; i < 6; i++) {
      await expectRejection(
        authService.resetPassword(email, '123456', 'NewPassword123'),
        400,
        INVALID_OTP,
      );
    }
    // The mock counter returns the next value: 6 failures were recorded
    expect(await redis.incrWithExpiry(`otp_attempts:${email}`, 600)).toBe(7);
  });

  it("rejects another user's OTP", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await authService.forgotPassword(alice.email);
    await authService.forgotPassword(bob.email);

    await expectRejection(
      authService.resetPassword(alice.email, lastOtp(), 'NewPassword123'),
      400,
      INVALID_OTP,
    );
  });
});
