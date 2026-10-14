import { createServer } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSocket } from './socket/index.js';
import { initJobs } from './jobs/index.js';
import { prisma } from './config/prisma.js';

const startServer = async () => {
  const app = createApp();
  const httpServer = createServer(app);

  // Initialize Socket.IO
  initSocket(httpServer);

  // Initialize BullMQ Queues and Workers
  await initJobs();

  const server = httpServer.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 HelpDesk API running on http://0.0.0.0:${env.PORT}`);
    logger.info(`📖 Swagger API Documentation available at http://localhost:${env.PORT}/api/docs`);
    logger.info(`🩺 Health check at http://localhost:${env.PORT}/api/v1/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
