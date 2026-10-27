import { Request, Response } from 'express';
import { OkResponse } from '@/core/success.response.js';
import { userService } from '@/services/user.service.js';
import { RESPONSE_MESSAGES } from '@/utils/constants.js';
import type {
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams,
} from '@/validations/user.validation.js';

class UserController {
  getProfile = async (req: Request, res: Response) => {
    const { id } = (req.validated?.params ?? req.params) as UserIdParams;
    const user = await userService.getProfile(id);

    return new OkResponse({
      data: user,
    });
  };

  updateProfile = async (req: Request, res: Response) => {
    const { id } = (req.validated?.params ?? req.params) as UserIdParams;
    const data = (req.validated?.body ?? req.body) as UpdateUserBody;
    const user = await userService.updateProfile(id, data);

    return new OkResponse({
      message: RESPONSE_MESSAGES.USERS.UPDATE,
      data: user,
    });
  };

  deleteUser = async (req: Request, res: Response) => {
    const { id } = (req.validated?.params ?? req.params) as UserIdParams;
    const result = await userService.deleteUser(id);

    return new OkResponse({
      message: RESPONSE_MESSAGES.USERS.DELETED,
      data: result,
    });
  };

  getMe = async (req: Request, res: Response) => {
    const user = await userService.getProfile(req.user!.userId);

    return new OkResponse({ data: user });
  };

  getAllUsers = async (req: Request, res: Response) => {
    const query = (req.validated?.query ?? req.query) as ListUsersQuery;
    const result = await userService.getAllUsers(query);

    return new OkResponse({
      message: RESPONSE_MESSAGES.USERS.GET_ALL,
      data: result,
    });
  };
}

export default new UserController();
