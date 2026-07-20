import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './config/logger';
import { pool } from './config/database';
import { redis, redisSub } from './config/redis';
import { initializeSocketIO } from './websocket';
import { startCronJobs } from './jobs/analytics';

async function main() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected');

    // ioredis auto-connects, just wait for it
    await redis.ping();
    await redisSub.ping();
    logger.info('Redis connected');

    const server = http.createServer(app);
    initializeSocketIO(server);

    startCronJobs();

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      await redis.quit();
      await redisSub.quit();
      await pool.end();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
