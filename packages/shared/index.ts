// ==========================================
// USER
// ==========================================

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AuthProvider = {
  LOCAL: 'local',
  GOOGLE: 'google',
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

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

// ==========================================
// FE-SPECIFIC RESPONSE SHAPES
// ==========================================

/** Login / Google OAuth: tokens are set as HttpOnly cookies, only user returned in body */
export interface ILoginResponse {
  user: IUserResponse;
}

/** Refresh: only accessToken confirmed in body, refreshToken rotated via cookie */
export interface IRefreshResponse {
  accessToken: string;
}
