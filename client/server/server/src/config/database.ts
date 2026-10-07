/**
 * MongoDB connection management.
 *
 * - Reads the URI from the validated environment configuration.
 * - Memoises the connection promise so development reloads never open a second
 *   connection.
 * - Never logs the URI (it usually embeds credentials).
 */
import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Fail fast on typos in queries instead of silently returning nothing.
mongoose.set('strictQuery', true);

let connectionPromise: Promise<typeof mongoose> | null = null;

function redactUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = '***';
    return parsed.toString();
  } catch {
    return '<unparseable-uri>';
  }
}

/**
 * Connects Mongoose to MongoDB. Safe to call multiple times: subsequent calls
 * reuse the in-flight or already established connection.
 */
export async function connectDatabase(uri: string = env.mongoUri): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  logger.info('Connecting to MongoDB', { uri: redactUri(uri) });

  connectionPromise = mongoose
    .connect(uri, {
      autoIndex: !env.isProduction,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,
      minPoolSize: env.isProduction ? 2 : 0,
    })
    .then((instance) => {
      logger.info('MongoDB connected', { database: instance.connection.name });
      return instance;
    })
    .catch((error: unknown) => {
      // Allow a later retry (used by the boot sequence and by tests).
      connectionPromise = null;
      logger.error('MongoDB connection failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    });

  return connectionPromise;
}

export async function disconnectDatabase(): Promise<void> {
  connectionPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

/** Current connection state, used by the health endpoint. */
export function getDatabaseState(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}
