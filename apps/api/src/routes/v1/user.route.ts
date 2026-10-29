import { Router } from 'express';
import userController from '@/controllers/user.controller.js';
import { validate } from '@/middlewares/validate.middleware.js';
import {
  requireAdmin,
  requireAuth,
  requireOwnerOrAdmin,
} from '@/middlewares/auth.middleware.js';
import { rateLimitMiddleware } from '@/middlewares/rateLimit.middleware.js';
import {
  updateUserSchema,
  userIdParamsSchema,
  listUsersSchema,
} from '@/validations/user.validation.js';
import { wrapAsyncHandler } from '@/utils/asyncHandler.js';

const userRouter: Router = Router();

// Runs after requireAuth so the limit is keyed per user, not per IP
const commonRateLimit = rateLimitMiddleware(10, 60);

userRouter.get(
  '/me',
  requireAuth,
  commonRateLimit,
  wrapAsyncHandler(userController.getMe),
);

userRouter.get(
  '/',
  requireAuth,
  commonRateLimit,
  requireAdmin,
  validate(listUsersSchema),
  wrapAsyncHandler(userController.getAllUsers),
);

userRouter.get(
  '/:id',
  requireAuth,
  commonRateLimit,
  requireOwnerOrAdmin,
  validate(userIdParamsSchema),
  wrapAsyncHandler(userController.getProfile),
);

userRouter.put(
  '/:id',
  requireAuth,
  commonRateLimit,
  requireOwnerOrAdmin,
  validate(updateUserSchema),
  wrapAsyncHandler(userController.updateProfile),
);

userRouter.delete(
  '/:id',
  requireAuth,
  commonRateLimit,
  requireOwnerOrAdmin,
  validate(userIdParamsSchema),
  wrapAsyncHandler(userController.deleteUser),
);

export default userRouter;
