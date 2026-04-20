import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import {
  UserStatus,
  AuthProvider,
  IUserResponse,
  IAuthResponse,
} from '@mern/shared';
import { userRepository } from '@/repositories/user.repository.js';
import { tokenRepository } from '@/repositories/token.repository.js';
import { tokenService } from '@/services/token.service.js';
import { userService } from '@/services/user.service.js';
import { emailService } from '@/services/email.service.js';
import {
  comparePassword,
  hashPassword,
  hashToken,
  generateOTP,
} from '@/utils/crypto.js';
import { validateAndNormalizeEmail } from '@/utils/emailValidation.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '@/core/error.response.js';
import { RESPONSE_MESSAGES } from '@/utils/constants.js';
import {
  IDeviceInfo,
  TokenType,
  createVerificationTokenDoc,
} from '@/models/token.model.js';

const assertAccountAllowed = (status: UserStatus) => {
  if (status === UserStatus.INACTIVE) {
    throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.ACCOUNT_INACTIVE);
  }
  if (status === UserStatus.BANNED) {
    throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.ACCOUNT_BANNED);
  }
};

export type GoogleCallbackResult =
  | {
      type: 'success';
      tokens: { accessToken: string; refreshToken: string };
      user: IUserResponse;
    }
  | { type: 'merge_required'; pendingToken: string };

class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUserResponse> {
    const created = await userService.createLocalUser(data);
    // Fire-and-forget: không block register nếu email gửi lỗi
    // void this.sendVerificationEmail(
    //   created._id!.toString(),
    //   created.email,
    //   created.name,
    // );
    return userService.toUserResponse(created);
  }

  async login(
    data: { email: string; password: string },
    deviceInfo?: IDeviceInfo,
  ): Promise<IAuthResponse> {
    const normalizedEmail = validateAndNormalizeEmail(data.email);

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    assertAccountAllowed(user.status);

    if (!user.password) {
      throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.GOOGLE_ONLY_ACCOUNT);
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await tokenService.generateAuthTokens(
      user._id!,
      user.role,
      deviceInfo,
    );

    return {
      user: userService.toUserResponse(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const result = await tokenService.verifyAndGetRefreshToken(refreshToken);
    if (!result) return;
    await tokenService.revokeSession(result.dbToken.sessionId!);
  }

  async logoutAll(userId: string): Promise<void> {
    await tokenService.revokeAllUserSessions(userId);
  }

  async refreshTokens(
    refreshToken: string,
    deviceInfo?: IDeviceInfo,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const result = await tokenService.verifyAndGetRefreshToken(refreshToken);
    if (!result) {
      throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.INVALID_REFRESH_TOKEN);
    }

    const { dbToken } = result;

    const user = await userRepository.findById(dbToken.userId.toString());
    if (!user) {
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);
    }
    assertAccountAllowed(user.status);

    await tokenService.revokeSession(dbToken.sessionId!);

    const mergedDeviceInfo =
      deviceInfo ?? (dbToken.deviceInfo as IDeviceInfo | undefined);
    const tokens = await tokenService.generateAuthTokens(
      user._id!,
      user.role,
      mergedDeviceInfo,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async getActiveSessions(userId: string) {
    return tokenService.getUserActiveSessions(userId);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  async handleGoogleCallback(
    profile: {
      id: string;
      emails?: { value: string }[];
      displayName: string;
      photos?: { value: string }[];
    },
    deviceInfo?: IDeviceInfo,
  ): Promise<GoogleCallbackResult> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequestError('Google account must have a valid email');
    }

    // 1. Returning Google user
    const userByGoogleId = await userRepository.findByGoogleId(profile.id);
    if (userByGoogleId) {
      assertAccountAllowed(userByGoogleId.status);
      const tokens = await tokenService.generateAuthTokens(
        userByGoogleId._id!,
        userByGoogleId.role,
        deviceInfo,
      );
      return {
        type: 'success',
        tokens,
        user: userService.toUserResponse(userByGoogleId),
      };
    }

    // 2. Email conflict — existing local account
    const userByEmail = await userRepository.findByEmail(email);
    if (userByEmail) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const now = new Date();
      await tokenRepository.create({
        token: hashToken(rawToken),
        type: TokenType.AccountLinkToken,
        userId:
          userByEmail._id! instanceof ObjectId
            ? userByEmail._id!
            : new ObjectId(userByEmail._id!),
        sessionId: profile.id, // reuse sessionId field to carry googleId
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      return { type: 'merge_required', pendingToken: rawToken };
    }

    // 3. New Google user
    const newUser = await userService.createGoogleUser({
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatar: profile.photos?.[0]?.value,
    });

    const tokens = await tokenService.generateAuthTokens(
      newUser._id!,
      newUser.role,
      deviceInfo,
    );
    return {
      type: 'success',
      tokens,
      user: userService.toUserResponse(newUser),
    };
  }

  async linkGoogleAccount(
    pendingToken: string,
    password: string,
    deviceInfo?: IDeviceInfo,
  ): Promise<IAuthResponse> {
    const tokenDoc = await tokenRepository.findByToken(
      hashToken(pendingToken),
      TokenType.AccountLinkToken,
    );

    if (!tokenDoc || !tokenDoc.isActive || tokenDoc.expiresAt < new Date()) {
      throw new BadRequestError(RESPONSE_MESSAGES.AUTH.INVALID_TOKEN);
    }

    const googleId = tokenDoc.sessionId!;
    const user = await userRepository.findById(tokenDoc.userId.toString());
    if (!user || !user.password) {
      throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedError(RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    await tokenRepository.revokeToken(tokenDoc._id!);

    const providers = user.providers?.includes(AuthProvider.GOOGLE)
      ? user.providers
      : [...(user.providers ?? [AuthProvider.LOCAL]), AuthProvider.GOOGLE];

    const updatedUser = await userRepository.updateById(user._id!.toString(), {
      googleId,
      providers,
    });
    if (!updatedUser)
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);

    const tokens = await tokenService.generateAuthTokens(
      updatedUser._id!,
      updatedUser.role,
      deviceInfo,
    );
    return {
      user: userService.toUserResponse(updatedUser),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // ─── Email Verification ───────────────────────────────────────────────────

  async sendVerificationEmail(
    userId: string,
    email: string,
    name?: string,
  ): Promise<void> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const doc = createVerificationTokenDoc({
      token: hashToken(rawToken),
      userId,
      type: TokenType.EmailVerificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await tokenRepository.create(doc);
    await emailService.sendVerificationEmail(email, rawToken, name);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenDoc = await tokenRepository.findByToken(
      hashToken(rawToken),
      TokenType.EmailVerificationToken,
    );

    if (!tokenDoc || !tokenDoc.isActive || tokenDoc.expiresAt < new Date()) {
      throw new BadRequestError(RESPONSE_MESSAGES.AUTH.INVALID_TOKEN);
    }

    await userRepository.updateById(tokenDoc.userId.toString(), {
      isEmailVerified: true,
    });
    await tokenRepository.revokeToken(tokenDoc._id!);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // Prevent email enumeration

    if (user.isEmailVerified) {
      throw new BadRequestError(RESPONSE_MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED);
    }

    await tokenRepository.revokeUserTokensByType(
      user._id!,
      TokenType.EmailVerificationToken,
    );
    await this.sendVerificationEmail(
      user._id!.toString(),
      user.email,
      user.name,
    );
  }

  // ─── Password Management ──────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.providers?.includes(AuthProvider.LOCAL)) return; // Prevent enumeration

    await tokenRepository.revokeUserTokensByType(
      user._id!,
      TokenType.PasswordResetToken,
    );

    const otp = generateOTP();
    const doc = createVerificationTokenDoc({
      token: hashToken(otp),
      userId: user._id!,
      type: TokenType.PasswordResetToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await tokenRepository.create(doc);
    await emailService.sendPasswordResetOTP(email, otp, user.name);
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new BadRequestError(RESPONSE_MESSAGES.AUTH.INVALID_TOKEN);

    const tokenDoc = await tokenRepository.findByToken(
      hashToken(otp),
      TokenType.PasswordResetToken,
    );

    if (
      !tokenDoc ||
      !tokenDoc.isActive ||
      tokenDoc.expiresAt < new Date() ||
      tokenDoc.userId.toString() !== user._id!.toString()
    ) {
      throw new BadRequestError(RESPONSE_MESSAGES.AUTH.INVALID_TOKEN);
    }

    await userRepository.updateById(user._id!.toString(), {
      password: await hashPassword(newPassword),
    });
    await tokenRepository.revokeToken(tokenDoc._id!);
    await tokenService.revokeAllUserSessions(user._id!);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sessionId: string,
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);

    if (!user.password) {
      throw new BadRequestError(RESPONSE_MESSAGES.AUTH.NO_PASSWORD_SET);
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid)
      throw new UnauthorizedError(
        RESPONSE_MESSAGES.AUTH.INVALID_CURRENT_PASSWORD,
      );

    if (currentPassword === newPassword) {
      throw new BadRequestError(
        RESPONSE_MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT,
      );
    }

    await userRepository.updateById(userId, {
      password: await hashPassword(newPassword),
    });
    await tokenRepository.revokeAllUserTokensExceptSession(userId, sessionId);
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);

    if (user.password) {
      throw new ConflictError(RESPONSE_MESSAGES.AUTH.PASSWORD_ALREADY_SET);
    }

    const providers = user.providers?.includes(AuthProvider.LOCAL)
      ? user.providers
      : [...(user.providers ?? []), AuthProvider.LOCAL];

    await userRepository.updateById(userId, {
      password: await hashPassword(newPassword),
      providers,
    });
  }
}

export const authService = AuthService.getInstance();
