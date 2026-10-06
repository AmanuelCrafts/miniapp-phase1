/**
 * Express application factory.
 *
 * Exported separately from the HTTP server so tests can mount the app with
 * supertest without binding a port.
 */
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Application, type RequestHandler } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import type { AuthRateLimitOptions } from './middleware/rateLimit.js';
import { createApiRouter } from './routes/index.js';
import { AppError } from './utils/AppError.js';
import { logger } from './utils/logger.js';

export interface CreateAppOptions {
  /** Overrides for the auth rate limiter (used by tests). */
  authRateLimit?: Partial<AuthRateLimitOptions>;
  /** Overrides for the CORS allowlist (used by tests). */
  allowedOrigins?: string[];
  /** Enables request logging. */
  enableRequestLogging?: boolean;
}

/**
 * Builds the CORS policy.
 *
 * The API is a credentialed endpoint, so `Access-Control-Allow-Origin` must be
 * the exact origin - `*` is invalid with cookies and is never used.
 */
function buildCorsOptions(allowedOrigins: string[]): CorsOptions {
  const allowlist = new Set(allowedOrigins);

  return {
    origin(origin, callback) {
      // Same-origin/native Telegram requests may omit the Origin header. There
      // is no cookie-based attack surface there because those clients do not
      // perform cross-site requests from a browser context.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowlist.has(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new AppError(403, 'CORS_ORIGIN_DENIED', `Origin ${origin} is not allowed to access this API`, {
          logLevel: 'debug',
        }),
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['RateLimit', 'RateLimit-Policy'],
    maxAge: 600,
  };
}

function buildRequestLogger(): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
}

export function createApp(options: CreateAppOptions = {}): Application {
  const app = express();

  // Correct client IPs behind a reverse proxy, which the rate limiter depends on.
  app.set('trust proxy', env.trustProxyHops);
  app.disable('x-powered-by');
  app.set('etag', false);

  app.use(
    helmet({
      // JSON API: CSP is the frontend's job, and a strict one breaks nothing here.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(cors(buildCorsOptions(options.allowedOrigins ?? [...env.allowedOrigins])));

  // Small body cap: initData is ~1-2 KB. This is the malformed/abuse guard.
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());

  if (options.enableRequestLogging ?? env.isDevelopment) {
    app.use(buildRequestLogger());
  }

  app.use('/api', createApiRouter(options.authRateLimit));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
