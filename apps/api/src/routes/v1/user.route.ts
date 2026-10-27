import { Router } from 'express';
import userController from '@/controllers/user.controller.js';
import authController from '@/controllers/auth.controller.js';
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
import { registerSchema } from '@/validations/auth.validation.js';
import { wrapAsyncHandler } from '@/utils/asyncHandler.js';

const userRouter: Router = Router();

const commonRateLimit = rateLimitMiddleware(10, 60);

userRouter.get(
  '/me',
  commonRateLimit,
  requireAuth,
  wrapAsyncHandler(userController.getMe),
);

userRouter.get(
  '/',
  commonRateLimit,
  requireAuth,
  requireAdmin,
  validate(listUsersSchema),
  wrapAsyncHandler(userController.getAllUsers),
);

userRouter.post(
  '/',
  rateLimitMiddleware(5, 60),
  validate(registerSchema),
  wrapAsyncHandler(authController.register),
);

userRouter.get(
  '/:id',
  commonRateLimit,
  requireAuth,
  requireOwnerOrAdmin,
  validate(userIdParamsSchema),
  wrapAsyncHandler(userController.getProfile),
);

userRouter.put(
  '/:id',
  commonRateLimit,
  requireAuth,
  requireOwnerOrAdmin,
  validate(updateUserSchema),
  wrapAsyncHandler(userController.updateProfile),
);

userRouter.delete(
  '/:id',
  commonRateLimit,
  requireAuth,
  requireOwnerOrAdmin,
  validate(userIdParamsSchema),
  wrapAsyncHandler(userController.deleteUser),
);

export default userRouter;
