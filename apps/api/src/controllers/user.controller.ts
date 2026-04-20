import { Request, Response } from 'express';
import { CreatedResponse, OkResponse } from '@/core/success.response.js';
import { userService } from '@/services/user.service.js';
import { RESPONSE_MESSAGES } from '@/utils/constants.js';

class UserController {
  register = async (req: Request, res: Response) => {
    const { name, email, password } = req.validated?.body ?? req.body;
    const user = userService.toUserResponse(await userService.createLocalUser({ name, email, password }));

    return new CreatedResponse({
      message: RESPONSE_MESSAGES.USERS.SIGNED_UP,
      data: user,
    });
  };

  getProfile = async (req: Request, res: Response) => {
    const { id } = req.validated?.params ?? req.params;
    const user = await userService.getProfile(id);

    return new OkResponse({
      data: user,
    });
  };

  updateProfile = async (req: Request, res: Response) => {
    const { id } = req.validated?.params ?? req.params;
    const data = req.validated?.body ?? req.body;
    const user = await userService.updateProfile(id, data);

    return new OkResponse({
      message: RESPONSE_MESSAGES.USERS.UPDATE,
      data: user,
    });
  };

  deleteUser = async (req: Request, res: Response) => {
    const { id } = req.validated?.params ?? req.params;
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
    const query = req.validated?.query ?? req.query;
    const result = await userService.getAllUsers(query);

    return new OkResponse({
      message: RESPONSE_MESSAGES.USERS.GET_ALL,
      data: result,
    });
  };
}

export default new UserController();
