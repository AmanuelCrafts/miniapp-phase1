/**
 * Health endpoint. Useful for container orchestration and for verifying the
 * database connection during setup. Exposes no credentials.
 */
import type { Request, Response } from 'express';

import { getDatabaseState } from '../config/database.js';
import { env } from '../config/env.js';

export function healthHandler(_req: Request, res: Response): void {
  const database = getDatabaseState();

  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    environment: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
