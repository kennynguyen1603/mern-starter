import { ObjectId } from 'mongodb';
import { database } from '@/config/db/db.js';

export const TOKEN_COLLECTION_NAME = 'tokens';

export enum TokenType {
  RefreshToken = 'refreshToken',
  EmailVerificationToken = 'emailVerificationToken',
  PasswordResetToken = 'passwordResetToken',
  WorkspaceInviteToken = 'workspaceInviteToken',
  AccountLinkToken = 'accountLinkToken',
  BlacklistedSession = 'blacklistedSession',
}

export interface IDeviceInfo {
  ipAddress: string;
  userAgent: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: string;
  deviceVendor?: string;
  deviceModel?: string;
  location?: string;
}

export interface ITokenDocument {
  _id?: ObjectId;
  token: string;
  type: TokenType;
  userId: ObjectId;
  sessionId?: string;
  deviceInfo?: IDeviceInfo;
  expiresAt: Date;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory helpers — tách riêng khỏi interface để giữ interface thuần tuý.
 * Trường hợp cần tạo document mới, gọi trực tiếp các hàm này thay vì class.
 */
export function createRefreshTokenDoc(data: {
  token: string;
  userId: ObjectId | string;
  sessionId: string;
  deviceInfo?: IDeviceInfo;
  expiresAt: Date;
}): Omit<ITokenDocument, '_id'> {
  const now = new Date();
  return {
    token: data.token,
    type: TokenType.RefreshToken,
    userId:
      typeof data.userId === 'string' ? new ObjectId(data.userId) : data.userId,
    sessionId: data.sessionId,
    deviceInfo: data.deviceInfo,
    expiresAt: data.expiresAt,
    isActive: true,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createVerificationTokenDoc(data: {
  token: string;
  userId: ObjectId | string;
  type: TokenType;
  expiresAt: Date;
}): Omit<ITokenDocument, '_id'> {
  const now = new Date();
  return {
    token: data.token,
    type: data.type,
    userId:
      typeof data.userId === 'string' ? new ObjectId(data.userId) : data.userId,
    expiresAt: data.expiresAt,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createTokenIndexes(): Promise<void> {
  const collection = database.database.collection(TOKEN_COLLECTION_NAME);

  await collection.createIndexes([
    { key: { token: 1, type: 1 }, name: 'idx_token_type' },
    { key: { sessionId: 1, type: 1 }, name: 'idx_sessionId_type' },
    {
      key: { userId: 1, isActive: 1, type: 1 },
      name: 'idx_userId_isActive_type',
    },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'idx_expiresAt_ttl' },
  ]);

  // Drop single-field indexes superseded by the compound ones above
  for (const name of ['idx_token', 'idx_userId', 'idx_sessionId']) {
    await collection.dropIndex(name).catch(() => {});
  }
}
