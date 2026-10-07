/**
 * Application level error type.
 *
 * Anything thrown as an `AppError` is considered *safe to show to the client*:
 * it carries an HTTP status, a stable machine readable code and a short human
 * message. Everything else is treated as an unexpected internal error and is
 * replaced by a generic 500 response.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_TELEGRAM_DATA'
  | 'EXPIRED_TELEGRAM_DATA'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'CORS_ORIGIN_DENIED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR';

export interface AppErrorOptions {
  /** Field level details. Only ever contains validation metadata. */
  details?: unknown;
  /** Log the error server side even for expected client errors. */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  cause?: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details: unknown;
  public readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  public readonly expose: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.logLevel = options.logLevel ?? 'info';
    this.expose = statusCode < 500;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Invalid request', code: ErrorCode = 'BAD_REQUEST', details?: unknown): AppError {
    return new AppError(400, code, message, { details });
  }

  static unauthorized(message = 'Authentication required', code: ErrorCode = 'UNAUTHORIZED'): AppError {
    return new AppError(401, code, message, { logLevel: 'debug' });
  }

  static forbidden(message = 'Forbidden', code: ErrorCode = 'FORBIDDEN'): AppError {
    return new AppError(403, code, message, { logLevel: 'debug' });
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message, { logLevel: 'debug' });
  }

  static conflict(message = 'Conflict'): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests'): AppError {
    return new AppError(429, 'RATE_LIMITED', message, { logLevel: 'debug' });
  }

  static internal(message = 'Internal server error', cause?: unknown): AppError {
    return new AppError(500, 'INTERNAL_SERVER_ERROR', message, { logLevel: 'error', cause });
  }
}
