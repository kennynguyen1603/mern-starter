import { Router } from 'express';
import userController from '@/controllers/user.controller.js';
import { validate } from '@/middlewares/validate.middleware.js';
import {
  requireAuth,
  requireOwnerOrAdmin,
} from '@/middlewares/auth.middleware.js';
import { rateLimitMiddleware } from '@/middlewares/rateLimit.middleware.js';
import {
  registerUserSchema,
  updateUserSchema,
  userIdParamsSchema,
  listUsersSchema,
} from '@/validations/user.validation.js';
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
  validate(listUsersSchema),
  wrapAsyncHandler(userController.getAllUsers),
);

userRouter.post(
  '/',
  rateLimitMiddleware(10, 60),
  validate(registerUserSchema),
  wrapAsyncHandler(userController.register),
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
