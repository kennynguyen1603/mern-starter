import type { IApiSuccess, ILoginRequest, ILoginResponse } from '@mern/shared';
import api from './axios';

export const loginApi = (data: ILoginRequest) =>
  api.post<IApiSuccess<ILoginResponse>>('/auth/login', data);

export const logoutApi = () => api.post<IApiSuccess<null>>('/auth/logout');
