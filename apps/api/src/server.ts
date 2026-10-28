import type { Server } from 'node:http';
import app from './app.js';
import { redis } from '@/config/redis/redis.js';
import { env } from '@/config/env/env.js';
import { database } from '@/config/db/db.js';
import { logger } from '@/utils/logger.js';

let server: Server | undefined;

async function startServer() {
  try {
    logger.info('Connecting to databases...', 'Server');
    await redis.connect();
    await database.connect();

    server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`, 'Server');
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', 'Server', '', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

startServer();

let shuttingDown = false;
const gracefulShutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down gracefully...', 'Server');
  try {
    // Stop accepting new connections and let in-flight requests finish
    const activeServer = server;
    if (activeServer)
      await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    await database.disconnect();
    await redis.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', 'Server', '', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
