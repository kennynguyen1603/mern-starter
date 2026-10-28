import { Collection, ObjectId, WithId } from 'mongodb';
import { database } from '@/config/db/db.js';
import {
  ITokenDocument,
  TOKEN_COLLECTION_NAME,
  TokenType,
} from '@/models/token.model.js';

const tokenCollection = (): Collection<ITokenDocument> => {
  return database.database.collection<ITokenDocument>(TOKEN_COLLECTION_NAME);
};

export const tokenRepository = {
  async create(
    data: Omit<ITokenDocument, '_id'>,
  ): Promise<WithId<ITokenDocument>> {
    const result = await tokenCollection().insertOne(data as ITokenDocument);
    return { ...data, _id: result.insertedId } as WithId<ITokenDocument>;
  },

  async findByToken(
    token: string,
    type: TokenType,
  ): Promise<WithId<ITokenDocument> | null> {
    return tokenCollection().findOne({ token, type });
  },

  async findActiveUserToken(
    userId: string | ObjectId,
    token: string,
    type: TokenType,
  ): Promise<WithId<ITokenDocument> | null> {
    return tokenCollection().findOne({
      userId: new ObjectId(userId),
      token,
      type,
      isActive: true,
    });
  },

  async findBySessionId(
    sessionId: string,
  ): Promise<WithId<ITokenDocument> | null> {
    return tokenCollection().findOne({
      sessionId,
      type: TokenType.RefreshToken,
    });
  },

  async findActiveTokensByUserId(
    userId: string | ObjectId,
  ): Promise<WithId<ITokenDocument>[]> {
    return tokenCollection()
      .find({
        userId: new ObjectId(userId),
        isActive: true,
        type: TokenType.RefreshToken,
      })
      .toArray();
  },

  async revokeToken(id: string | ObjectId): Promise<boolean> {
    const result = await tokenCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  },

  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await tokenCollection().updateOne(
      { sessionId, type: TokenType.RefreshToken, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  },

  async revokeAllUserTokens(userId: string | ObjectId): Promise<boolean> {
    const result = await tokenCollection().updateMany(
      { userId: new ObjectId(userId), isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  },

  async revokeUserTokensByType(
    userId: string | ObjectId,
    type: TokenType,
  ): Promise<boolean> {
    const result = await tokenCollection().updateMany(
      { userId: new ObjectId(userId), type, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  },

  async revokeAllUserTokensExceptSession(
    userId: string | ObjectId,
    sessionId: string,
  ): Promise<boolean> {
    const result = await tokenCollection().updateMany(
      {
        userId: new ObjectId(userId),
        isActive: true,
        sessionId: { $ne: sessionId },
      },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  },

  async updateLastUsed(id: string | ObjectId): Promise<void> {
    await tokenCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastUsedAt: new Date(), updatedAt: new Date() } },
    );
  },

  async isSessionBlacklisted(sessionId: string): Promise<boolean> {
    const doc = await tokenCollection().findOne({
      sessionId,
      type: TokenType.BlacklistedSession,
    });
    return doc !== null;
  },

  async blacklistSessions(
    sessions: Array<{ sessionId: string; userId: ObjectId }>,
    expiresAt: Date,
  ): Promise<void> {
    if (sessions.length === 0) return;
    const now = new Date();
    await tokenCollection().insertMany(
      sessions.map((s) => ({
        token: s.sessionId,
        type: TokenType.BlacklistedSession,
        userId: s.userId,
        sessionId: s.sessionId,
        expiresAt,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })) as ITokenDocument[],
    );
  },
};
