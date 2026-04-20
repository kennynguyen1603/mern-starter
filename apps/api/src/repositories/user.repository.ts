import { Collection, ObjectId, WithId } from 'mongodb';
import { database } from '@/config/db/db.js';
import { IUserDocument, USER_COLLECTION_NAME } from '@/models/user.model.js';

const userCollection = (): Collection<IUserDocument> => {
  return database.database.collection<IUserDocument>(USER_COLLECTION_NAME);
};

export const userRepository = {
  async findByEmail(email: string): Promise<WithId<IUserDocument> | null> {
    return userCollection().findOne({ email });
  },

  async findById(id: string): Promise<WithId<IUserDocument> | null> {
    return userCollection().findOne({
      _id: new ObjectId(id),
    });
  },

  async findByGoogleId(
    googleId: string,
  ): Promise<WithId<IUserDocument> | null> {
    return userCollection().findOne({ googleId });
  },

  async create(data: IUserDocument): Promise<WithId<IUserDocument>> {
    const result = await userCollection().insertOne(data);
    return { ...data, _id: result.insertedId };
  },

  async updateById(
    id: string,
    data: Partial<IUserDocument>,
  ): Promise<WithId<IUserDocument> | null> {
    const result = await userCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    return result ?? null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await userCollection().deleteOne({
      _id: new ObjectId(id),
    });
    return result.deletedCount === 1;
  },

  getCollection(): Collection<IUserDocument> {
    return userCollection();
  },
};
