import app from './app.js';
import { redis } from '@/config/redis/redis.js';
import { env } from '@/config/env/env.js';
import { database } from '@/config/db/db.js';

let server: any;

async function startServer() {
  try {
    console.log('📡 Connecting to databases...');
    await redis.connect();
    await database.connect();

    server = app.listen(env.port, () => {
      console.log(`✅ Server running on port ${env.port}`);
      console.log(`🔗 Backend URL: http://localhost:${env.port}`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');
  await database.disconnect();
  await redis.disconnect();
  process.exit(0);
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default server;
