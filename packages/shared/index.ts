// ==========================================
// USER
// ==========================================

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  authProvider: AuthProvider;
  providers: AuthProvider[];
  createdAt: Date;
  updatedAt: Date;
}

/** Response type cho FE — không chứa password, googleId */
export type IUserResponse = Omit<IUser, 'password'>;

// ==========================================
// AUTH
// ==========================================

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface ITokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: IUserResponse;
  tokens: ITokensResponse;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ==========================================
// PAGINATION
// ==========================================

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
  message?: string;
}

// ==========================================
// API RESPONSE
// ==========================================

export interface IApiError {
  message: string;
  status: number;
  details?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface IApiSuccess<T = any> {
  message: string;
  status: number;
  data: T;
}
