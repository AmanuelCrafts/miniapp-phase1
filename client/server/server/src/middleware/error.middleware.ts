/**
 * Centralized error handling.
 *
 * Guarantees:
 *  - one consistent JSON error shape for every failure;
 *  - no stack traces, driver messages or secrets in production responses;
 *  - unexpected errors are logged server side with full detail.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { AppError, type ErrorCode } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/** 404 for unmatched routes. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.path} was not found`));
};

/** Converts well known third party errors into safe AppErrors. */
function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return AppError.badRequest('Invalid request', 'VALIDATION_ERROR', {
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { type?: string; status?: number; statusCode?: number; code?: number };

    // body-parser errors
    if (candidate.type === 'entity.parse.failed') {
      return AppError.badRequest('Malformed JSON body', 'BAD_REQUEST');
    }
    if (candidate.type === 'entity.too.large') {
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
    if (candidate.type === 'encoding.unsupported') {
      return new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported content encoding');
    }

    // MongoDB / Mongoose
    if (candidate.code === 11_000) {
      return AppError.conflict('Resource already exists');
    }
    const mongoStatus = candidate.status ?? candidate.statusCode;
    if (mongoStatus === 11000) {
      return AppError.conflict('Resource already exists');
    }

    // CORS rejection surfaced through AppError by the cors middleware; anything
    // else with a 4xx status is treated as a bad request rather than a 500.
    if (typeof mongoStatus === 'number' && mongoStatus >= 400 && mongoStatus < 500) {
      return new AppError(mongoStatus, 'BAD_REQUEST', 'Invalid request');
    }
  }

  return AppError.internal('Internal server error', error);
}

/** Express error middleware. Must keep the 4-argument signature. */
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appError = normalizeError(error);

  const logMeta = {
    code: appError.code,
    status: appError.statusCode,
    method: req.method,
    path: req.path,
    ...(appError.statusCode >= 500 && error instanceof Error
      ? { reason: appError.message, stack: error.stack }
      : {}),
  };

  if (appError.statusCode >= 500) {
    logger.error(appError.message, logMeta);
  } else {
    logger[appError.logLevel](appError.message, logMeta);
  }

  // Never expose internals in production.
  const body: ErrorResponseBody = {
    error: {
      code: appError.code,
      message: appError.expose ? appError.message : 'Internal server error',
    },
  };

  if (appError.details !== undefined && appError.expose) {
    body.error.details = appError.details;
  }

  if (!env.isProduction && appError.statusCode >= 500 && error instanceof Error) {
    body.error.details = { reason: appError.message };
  }

  if (res.headersSent) {
    res.end();
    return;
  }

  res.status(appError.statusCode).json(body);
};
