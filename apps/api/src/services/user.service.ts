import { WithId } from 'mongodb';
import { UserRole, UserStatus, AuthProvider, IUserResponse } from '@mern/shared';
import { userRepository } from '@/repositories/user.repository.js';
import { IUserDocument } from '@/models/user.model.js';
import { ConflictError, NotFoundError } from '@/core/error.response.js';
import { hashPassword } from '@/utils/crypto.js';
import { validateAndNormalizeEmail } from '@/utils/emailValidation.js';
import { PaginationUtils, IListQuery } from '@/utils/pagination.utils.js';
import { RESPONSE_MESSAGES } from '@/utils/constants.js';

class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  toUserResponse(user: WithId<IUserDocument>): IUserResponse {
    const { password: _pw, googleId: _gid, ...rest } = user;
    return {
      ...rest,
      _id: rest._id?.toString(),
    } as IUserResponse;
  }

  async createLocalUser(data: { name: string; email: string; password: string }): Promise<WithId<IUserDocument>> {
    const normalizedEmail = validateAndNormalizeEmail(data.email);

    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError(RESPONSE_MESSAGES.USERS.EMAIL_ALREADY_IN_USE);
    }

    const hashedPassword = await hashPassword(data.password);
    const now = new Date();

    const userDoc: IUserDocument = {
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
      authProvider: AuthProvider.LOCAL,
      providers: [AuthProvider.LOCAL],
      createdAt: now,
      updatedAt: now,
    };

    return userRepository.create(userDoc);
  }

  async createGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<WithId<IUserDocument>> {
    const now = new Date();

    const userDoc: IUserDocument = {
      name: data.name.trim(),
      email: data.email,
      googleId: data.googleId,
      avatar: data.avatar,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      authProvider: AuthProvider.GOOGLE,
      providers: [AuthProvider.GOOGLE],
      createdAt: now,
      updatedAt: now,
    };

    return userRepository.create(userDoc);
  }

  async getProfile(id: string): Promise<IUserResponse> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);
    }
    return this.toUserResponse(user);
  }

  async updateProfile(id: string, data: { name?: string; avatar?: string }): Promise<IUserResponse> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);
    }

    const updateData: Partial<IUserDocument> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    const updatedUser = await userRepository.updateById(id, updateData);
    if (!updatedUser) {
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);
    }

    return this.toUserResponse(updatedUser);
  }

  async deleteUser(id: string): Promise<{ id: string }> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);
    }

    const deleted = await userRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS);
    }

    return { id };
  }

  async getAllUsers(query: IListQuery) {
    return PaginationUtils.paginate(
      userRepository.getCollection() as any,
      query,
      {
        projection: { password: 0, googleId: 0 } as any,
        sort: { createdAt: -1 },
      },
      {
        textSearch: {
          query: query.search || '',
          fields: ['name', 'email'],
        },
      },
    );
  }
}

// Export duy nhất instance theo Singleton Pattern
export const userService = UserService.getInstance();
