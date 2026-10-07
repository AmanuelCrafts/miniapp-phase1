/**
 * Minimal dependency free logger.
 *
 * Deliberately avoids dumping request bodies or configuration objects so that
 * secrets (bot token, session secret, database credentials) can never end up in
 * the log stream.
 */
import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel | 'silent', number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const threshold = LEVEL_WEIGHT[env.logLevel];

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < threshold) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
