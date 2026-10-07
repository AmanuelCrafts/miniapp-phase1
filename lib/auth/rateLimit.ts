const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record || record.resetAt <= now) {
    attempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count++;

  if (record.count > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

export function resetRateLimit(identifier: string): void {
  attempts.delete(identifier);
}
