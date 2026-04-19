import { Router } from 'express';
import passport from '@/config/passport/passport.js';
import authController from '@/controllers/auth.controller.js';
import { validate } from '@/middlewares/validate.middleware.js';
import { requireAuth } from '@/middlewares/auth.middleware.js';
import { rateLimitMiddleware } from '@/middlewares/rateLimit.middleware.js';
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  setPasswordSchema,
  googleLinkSchema,
} from '@/validations/auth.validation.js';
import { wrapAsyncHandler } from '@/utils/asyncHandler.js';

const authRouter: Router = Router();

// ─── Local Auth ───────────────────────────────────────────────────────────────

authRouter.post(
  '/register',
  rateLimitMiddleware(5, 60),
  validate(registerSchema),
  wrapAsyncHandler(authController.register),
);

authRouter.post(
  '/login',
  rateLimitMiddleware(10, 60),
  validate(loginSchema),
  wrapAsyncHandler(authController.login),
);

authRouter.post('/logout', requireAuth, wrapAsyncHandler(authController.logout));

authRouter.post('/logout-all', requireAuth, wrapAsyncHandler(authController.logoutAll));

authRouter.post('/refresh', rateLimitMiddleware(20, 60), wrapAsyncHandler(authController.refresh));

authRouter.get('/sessions', requireAuth, wrapAsyncHandler(authController.getSessions));

// ─── Google OAuth ─────────────────────────────────────────────────────────────

authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
  wrapAsyncHandler(authController.googleCallback),
);

authRouter.post(
  '/google/link',
  rateLimitMiddleware(5, 15 * 60),
  validate(googleLinkSchema),
  wrapAsyncHandler(authController.googleLink),
);

// ─── Email Verification ───────────────────────────────────────────────────────

authRouter.get(
  '/verify-email',
  validate(verifyEmailSchema),
  wrapAsyncHandler(authController.verifyEmail),
);

authRouter.post(
  '/resend-verification',
  rateLimitMiddleware(3, 60 * 60),
  validate(resendVerificationSchema),
  wrapAsyncHandler(authController.resendVerification),
);

// ─── Password Management ──────────────────────────────────────────────────────

authRouter.post(
  '/forgot-password',
  rateLimitMiddleware(5, 60 * 60),
  validate(forgotPasswordSchema),
  wrapAsyncHandler(authController.forgotPassword),
);

authRouter.post(
  '/reset-password',
  rateLimitMiddleware(10, 60 * 60),
  validate(resetPasswordSchema),
  wrapAsyncHandler(authController.resetPassword),
);

authRouter.post(
  '/change-password',
  requireAuth,
  rateLimitMiddleware(5, 15 * 60),
  validate(changePasswordSchema),
  wrapAsyncHandler(authController.changePassword),
);

authRouter.post(
  '/set-password',
  requireAuth,
  rateLimitMiddleware(5, 15 * 60),
  validate(setPasswordSchema),
  wrapAsyncHandler(authController.setPassword),
);

export default authRouter;
