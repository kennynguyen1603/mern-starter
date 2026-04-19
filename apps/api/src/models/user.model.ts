import { ObjectId } from 'mongodb';
import { UserRole, UserStatus, AuthProvider } from '@mern/shared';
import { database } from '@/config/db/db.js';

export const USER_COLLECTION_NAME = 'users';

/**
 * MongoDB Document type cho User
 * Dùng nội bộ trong BE — FE dùng IUser / IUserResponse từ @mern/shared
 */
export interface IUserDocument {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  authProvider: AuthProvider;
  providers: AuthProvider[];
  googleId?: string;
  // twitterId?: string — reserved for future Twitter integration
  createdAt: Date;
  updatedAt: Date;
}

export async function createUserIndexes(): Promise<void> {
  const collection = database.database.collection(USER_COLLECTION_NAME);

  await collection.createIndexes([
    { key: { email: 1 }, unique: true, name: 'idx_email_unique' },
    { key: { googleId: 1 }, unique: true, sparse: true, name: 'idx_googleId_unique_sparse' },
    { key: { status: 1 }, name: 'idx_status' },
    { key: { role: 1 }, name: 'idx_role' },
    { key: { createdAt: -1 }, name: 'idx_createdAt' },
  ]);
}
