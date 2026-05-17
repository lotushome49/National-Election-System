import http from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initSocket } from './config/socket';
import { logger } from './config/logger';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  // 1. Connect to database
  await connectDatabase();

  // 2. Create Express app
  const app    = createApp();
  const server = http.createServer(app);

  // 3. Attach Socket.IO
  initSocket(server);

  // 4. Start listening
  server.listen(env.PORT, () => {
    logger.info(`🚀 NEHS API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📡 API base: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10 s if connections don't drain
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // ── Unhandled rejections / exceptions ──────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
    process.exit(1);
  });
}

bootstrap();
