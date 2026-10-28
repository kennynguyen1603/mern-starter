import { MongoClient, Db } from 'mongodb';
import { env } from '@/config/env/env.js';
import { createUserIndexes } from '@/models/user.model.js';
import { createTokenIndexes } from '@/models/token.model.js';
import { logger } from '@/utils/logger.js';

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

    logger.info('MongoDB connected', 'Database');

    try {
      await Promise.all([createUserIndexes(), createTokenIndexes()]);
      logger.info('All indexes created successfully', 'Database');
    } catch (error) {
      logger.error('Error creating indexes', 'Database', '', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      logger.info('Disconnected from the database', 'Database');
    } catch (error) {
      logger.error('Error disconnecting from the database', 'Database', '', {
        error: error instanceof Error ? error.message : String(error),
      });
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
