import { Request, Response, CookieOptions } from 'express';
import { OkResponse, CreatedResponse } from '@/core/success.response.js';
import { authService, GoogleCallbackResult } from '@/services/auth.service.js';
import { getSecurityContext } from '@/utils/security.utils.js';
import { RESPONSE_MESSAGES } from '@/utils/constants.js';
import { UnauthorizedError } from '@/core/error.response.js';
import { env } from '@/config/env/env.js';

const IS_PRODUCTION = env.nodeEnv === 'production';

const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
};

const ACCESS_TOKEN_COOKIE: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000,
};

const REFRESH_TOKEN_COOKIE: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) => {
  res.cookie('accessToken', tokens.accessToken, ACCESS_TOKEN_COOKIE);
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_TOKEN_COOKIE);
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
};

const extractRefreshToken = (req: Request): string => {
  const token = (req.cookies?.refreshToken as string | undefined) ?? (req.body?.refreshToken as string | undefined);
  if (!token) throw new UnauthorizedError('Refresh token is required');
  return token;
};

class AuthController {
  register = async (req: Request, res: Response) => {
    const { name, email, password } = req.validated?.body ?? req.body;
    const user = await authService.register({ name, email, password });
    return new CreatedResponse({
      message: RESPONSE_MESSAGES.AUTH.REGISTER_SUCCESS,
      data: { user },
    });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.validated?.body ?? req.body;
    const { ip, userAgent, deviceInfo } = getSecurityContext(req);
    const result = await authService.login({ email, password }, { ipAddress: ip, userAgent, ...deviceInfo });
    setAuthCookies(res, result.tokens);
    return new OkResponse({
      message: RESPONSE_MESSAGES.AUTH.LOGIN_SUCCESS,
      data: { user: result.user },
    });
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = extractRefreshToken(req);
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.LOGOUT_SUCCESS });
  };

  logoutAll = async (req: Request, res: Response) => {
    const refreshToken = extractRefreshToken(req);
    const userId = req.user!.userId;
    await authService.logout(refreshToken);
    await authService.logoutAll(userId);
    clearAuthCookies(res);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.LOGOUT_ALL_SUCCESS });
  };

  refresh = async (req: Request, res: Response) => {
    const refreshToken = extractRefreshToken(req);
    const { ip, userAgent, deviceInfo } = getSecurityContext(req);
    const tokens = await authService.refreshTokens(refreshToken, { ipAddress: ip, userAgent, ...deviceInfo });
    setAuthCookies(res, tokens);
    return new OkResponse({
      message: RESPONSE_MESSAGES.AUTH.REFRESH_SUCCESS,
      data: { accessToken: tokens.accessToken },
    });
  };

  getSessions = async (req: Request, res: Response) => {
    const sessions = await authService.getActiveSessions(req.user!.userId);
    return new OkResponse({ data: sessions });
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  googleCallback = async (req: Request, res: Response) => {
    const result = req.user as unknown as GoogleCallbackResult;

    if (result.type === 'success') {
      setAuthCookies(res, result.tokens);
      return res.redirect(`${env.frontendUrl}/?auth=success`);
    }

    return res.redirect(
      `${env.frontendUrl}/auth/link-account?token=${result.pendingToken}`,
    );
  };

  googleLink = async (req: Request, res: Response) => {
    const { pendingToken, password } = req.validated?.body ?? req.body;
    const { ip, userAgent, deviceInfo } = getSecurityContext(req);
    const result = await authService.linkGoogleAccount(pendingToken, password, { ipAddress: ip, userAgent, ...deviceInfo });
    setAuthCookies(res, result.tokens);
    return new OkResponse({
      message: RESPONSE_MESSAGES.AUTH.ACCOUNT_LINK_SUCCESS,
      data: { user: result.user },
    });
  };

  // ─── Email Verification ───────────────────────────────────────────────────

  verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.validated?.query ?? req.query;
    await authService.verifyEmail(token as string);
    return res.redirect(`${env.frontendUrl}/login?verified=true`);
  };

  resendVerification = async (req: Request, res: Response) => {
    const { email } = req.validated?.body ?? req.body;
    await authService.resendVerification(email);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.EMAIL_VERIFICATION_SENT });
  };

  // ─── Password Management ──────────────────────────────────────────────────

  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.validated?.body ?? req.body;
    await authService.forgotPassword(email);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.FORGOT_PASSWORD_SENT });
  };

  resetPassword = async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.validated?.body ?? req.body;
    await authService.resetPassword(email, otp, newPassword);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS });
  };

  changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.validated?.body ?? req.body;
    const { userId, sessionId } = req.user!;
    await authService.changePassword(userId, currentPassword, newPassword, sessionId);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.PASSWORD_CHANGED });
  };

  setPassword = async (req: Request, res: Response) => {
    const { newPassword } = req.validated?.body ?? req.body;
    await authService.setPassword(req.user!.userId, newPassword);
    return new OkResponse({ message: RESPONSE_MESSAGES.AUTH.PASSWORD_SET });
  };
}

export default new AuthController();
