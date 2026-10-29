import type {
  IApiSuccess,
  IPaginatedResponse,
  IUserResponse,
} from '@mern/shared';
import api from './axios';

export type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export const getMeApi = () => api.get<IApiSuccess<IUserResponse>>('/user/me');

export const getUsersApi = (params: ListUsersParams) =>
  api.get<IApiSuccess<IPaginatedResponse<IUserResponse>>>('/user', { params });

export const deleteUserApi = (id: string) =>
  api.delete<IApiSuccess<null>>(`/user/${id}`);
