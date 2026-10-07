/**
 * Wraps async route handlers so rejected promises reach the centralized error
 * middleware. Express 5 forwards rejections automatically, but the explicit
 * wrapper keeps the behaviour identical across versions.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
