import http from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './configs/database';
import { initSocket } from './configs/socket';
import { logger } from './configs/logger';
import { env } from './configs/env';

async function bootstrap(): Promise<void> {
  // 1. Connect to database
  await connectDatabase();

  // 2. Create Express app and HTTP server
  const app = createApp();
  const server = http.createServer(app);

  // 3. Initialize Socket.IO
  initSocket(server);

  // 4. Start listening with port conflict handling
  let port = Number(env.PORT) || 3000;
  const maxAttempts = 5;
  let attempts = 0;

  const startListening = () => {
    server.listen(port, () => {
      logger.info(`🚀 NEHS API running on port ${port} [${env.NODE_ENV}]`);
      logger.info(`📡 API base: http://localhost:${port}/api/${env.API_VERSION}`);
    });
  };

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} already in use.`);
      if (attempts < maxAttempts) {
        attempts += 1;
        port += 1;
        logger.info(`Retrying on port ${port} (attempt ${attempts})`);
        startListening();
      } else {
        logger.error('Maximum port retry attempts reached. Exiting.');
        process.exit(1);
      }
    } else {
      logger.error('Server error', { err });
      process.exit(1);
    }
  });

  // Initial attempt
  startListening();

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
  process.on('SIGINT', () => shutdown('SIGINT'));

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
