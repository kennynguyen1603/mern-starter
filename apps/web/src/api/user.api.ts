import type {
  IApiSuccess,
  IPaginatedResponse,
  IUserResponse,
} from '@mern/shared';
import api from './axios';

export const getMeApi = () =>
  api.get<IApiSuccess<IUserResponse>>('/user/me');

export const getProfileApi = (id: string) =>
  api.get<IApiSuccess<IUserResponse>>(`/user/${id}`);

export const updateProfileApi = (
  id: string,
  data: { name?: string; avatar?: string },
) => api.put<IApiSuccess<IUserResponse>>(`/user/${id}`, data);

export const getAllUsersApi = (params?: Record<string, unknown>) =>
  api.get<IApiSuccess<IPaginatedResponse<IUserResponse>>>('/user', { params });

export const deleteUserApi = (id: string) =>
  api.delete<IApiSuccess<null>>(`/user/${id}`);
