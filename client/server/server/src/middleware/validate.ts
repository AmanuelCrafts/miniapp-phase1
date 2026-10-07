import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../utils/AppError.js';

/**
 * Express middleware that validates a request segment against a Zod schema.
 *
 * The parsed (and therefore normalised) result replaces the raw input on
 * `req.validated`, so controllers always work with trusted, typed data.
 */
export function validate<T>(schema: ZodType<T>, source: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query);

    if (!result.success) {
      next(
        AppError.badRequest('Invalid request', 'VALIDATION_ERROR', {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      );
      return;
    }

    const target = req.validated as Record<string, unknown> | undefined;
    if (target) {
      target[source] = result.data;
    } else {
      req.validated = { [source]: result.data };
    }

    next();
  };
}
