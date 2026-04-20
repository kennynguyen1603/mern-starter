import type {
  IApiSuccess,
  ILoginRequest,
  ILoginResponse,
  IRegisterRequest,
  IUserResponse,
} from '@mern/shared';
import api from './axios';

export const loginApi = (data: ILoginRequest) =>
  api.post<IApiSuccess<ILoginResponse>>('/auth/login', data);

export const registerApi = (data: IRegisterRequest) =>
  api.post<IApiSuccess<{ user: IUserResponse }>>('/auth/register', data);

export const logoutApi = () =>
  api.post<IApiSuccess<null>>('/auth/logout');

export const forgotPasswordApi = (email: string) =>
  api.post<IApiSuccess<null>>('/auth/forgot-password', { email });

export const resetPasswordApi = (data: {
  email: string;
  otp: string;
  newPassword: string;
}) => api.post<IApiSuccess<null>>('/auth/reset-password', data);

export const changePasswordApi = (data: {
  currentPassword: string;
  newPassword: string;
}) => api.post<IApiSuccess<null>>('/auth/change-password', data);

export const setPasswordApi = (newPassword: string) =>
  api.post<IApiSuccess<null>>('/auth/set-password', { newPassword });

export const googleLinkApi = (data: {
  pendingToken: string;
  password: string;
}) => api.post<IApiSuccess<ILoginResponse>>('/auth/google/link', data);
