/**
 * Server-side environment access.
 *
 * Values are read lazily (never at module import) so that builds and scripts
 * do not require every variable to be present — each consumer validates what
 * it actually needs at runtime with a clear error message.
 *
 * Secrets (TELEGRAM_BOT_TOKEN, SESSION_SECRET) must never be exposed to the
 * client. Do not create NEXT_PUBLIC_* mirrors of them.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value.trim();
}

export function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number.`);
  }
  return parsed;
}
