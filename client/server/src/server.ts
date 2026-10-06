/**
 * HTTP server bootstrap.
 *
 * Responsibilities: validate configuration, connect MongoDB, start listening,
 * and shut everything down cleanly on a signal.
 */
import { createServer } from 'node:http';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  // A failed database connection must stop the process: an API that cannot
  // verify sessions or create users is worse than one that refuses to start.
  await connectDatabase();

  const app = createApp({ enableRequestLogging: true });
  const server = createServer(app);

  server.listen(env.port, () => {
    logger.info('API listening', {
      port: env.port,
      environment: env.nodeEnv,
      allowedOrigins: env.allowedOrigins,
    });

    if (env.isProduction) {
      logger.info('Production hardening active', {
        secureCookies: env.cookieSecure,
        cookieSameSite: env.sessionCookieSameSite,
        authRateLimitPerWindow: `${env.authRateLimit.max}/${env.authRateLimit.windowMs}ms`,
      });
    }
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutting down', { signal });
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { reason: error.message });
    void shutdown('uncaughtException');
  });
}

main().catch((error: unknown) => {
  logger.error('Failed to start server', {
    reason: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
