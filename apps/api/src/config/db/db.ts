import { MongoClient, Db } from 'mongodb';
import { env } from '@/config/env/env.js';
import { createUserIndexes } from '@/models/user.model.js';
import { createTokenIndexes } from '@/models/token.model.js';

class Database {
  private static instance: Database;
  private client: MongoClient;
  private db!: Db;

  private constructor() {
    const uri = env.mongo.uri;
    if (!uri) {
      throw new Error('MongoDB URI is not provided in environment variables');
    }

    this.client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      retryWrites: true,
      w: 'majority',
    });
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect() {
    if (this.db) return;

    await this.client.connect();
    this.db = this.client.db(env.mongo.dbName);

    console.log('✅ MongoDB connected');

    try {
      await Promise.all([createUserIndexes(), createTokenIndexes()]);
      console.log('✅ All indexes created successfully');
    } catch (error) {
      console.error('⚠️ Error creating indexes:', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('Disconnected from the database');
    } catch (error) {
      console.error('Error disconnecting from the database:', error);
      throw error;
    }
  }

  get database(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}

export const database = Database.getInstance();
