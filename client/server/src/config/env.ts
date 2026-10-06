/**
 * Application configuration.
 *
 * Every value is read from the process environment and validated with Zod so
 * that a misconfigured deployment fails fast at boot instead of failing in
 * production. Secrets are only ever available on the server: nothing in this
 * module is shipped to the browser.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnvFile } from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Load `server/.env` (and an optional `server/.env.local` for machine specific
// overrides) before reading `process.env`.
loadEnvFile({ path: path.join(serverRoot, '.env'), quiet: true });
loadEnvFile({ path: path.join(serverRoot, '.env.local'), quiet: true });

/** Parses "true"/"1"/"yes" style booleans coming from environment variables. */
const envBoolean = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === '') return defaultValue;
      return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
    });

const envNumber = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.trim() === '' ? defaultValue : Number(value)))
    .pipe(z.number());

const optionalUrlList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

const allowedOriginsSchema = optionalUrlList.refine(
  (origins) => origins.every((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }),
  'FRONTEND_URL must be a comma separated list of http(s) origins (localhost allowed)',
);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: envNumber(4000).pipe(z.number().int().min(1).max(65_535)),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),

  // Server-only secret. Never exposed to the client.
  TELEGRAM_BOT_TOKEN: z.string().trim().min(1, 'TELEGRAM_BOT_TOKEN is required'),

  SESSION_SECRET: z.string().trim().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_DAYS: envNumber(30).pipe(z.number().int().min(1).max(365)),
  SESSION_COOKIE_NAME: z.string().trim().min(1).max(64).default('tgma_session'),
  SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),

  FRONTEND_URL: allowedOriginsSchema.refine((origins) => origins.length > 0, {
    message: 'FRONTEND_URL is required and must list at least one origin',
  }),

  AUTH_RATE_LIMIT: envNumber(10).pipe(z.number().int().min(1)),
  AUTH_RATE_LIMIT_WINDOW_MS: envNumber(60_000).pipe(z.number().int().min(1_000)),

  TELEGRAM_AUTH_MAX_AGE_SECONDS: envNumber(86_400).pipe(z.number().int().min(60)),
  TELEGRAM_ED25519_PUBLIC_KEY: z.string().trim().min(1).optional(),

  TRUST_PROXY_HOPS: envNumber(1).pipe(z.number().int().min(0).max(10)),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),

  // Development escape hatch: never enable in production.
  ALLOW_INSECURE_COOKIES: envBoolean(false),
});

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('\n');
}

function parseEnv(source: NodeJS.ProcessEnv): z.infer<typeof rawEnvSchema> {
  const result = rawEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(result.error)}\n\n` +
        'Copy `server/.env.example` to `server/.env` and provide the missing values.',
    );
  }

  return result.data;
}

const raw = parseEnv(process.env);

const isProduction = raw.NODE_ENV === 'production';
const isTest = raw.NODE_ENV === 'test';

/**
 * Placeholder text left over from `.env.example`.
 *
 * The example bot token is shaped like a real one (`<id>:replace-with-...`), so
 * checking only a prefix would never match it and a copy-pasted example could
 * reach production. The marker is searched for anywhere in the value.
 */
function isPlaceholderSecret(value: string): boolean {
  return /replace[-_ ]?with|your[-_ ]?real|example|changeme|placeholder/i.test(value);
}

if (isProduction) {
  if (isPlaceholderSecret(raw.TELEGRAM_BOT_TOKEN)) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN still contains the placeholder value from .env.example. ' +
        'Set the real token issued by @BotFather.',
    );
  }
  if (isPlaceholderSecret(raw.SESSION_SECRET)) {
    throw new Error(
      'SESSION_SECRET still contains the placeholder value from .env.example. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
}

/**
 * Telegram Mini Apps are loaded inside a WebView that is a *third party*
 * context relative to the API domain, so cross-site cookies are required.
 * `none` + `secure` is therefore the production default. On plain http
 * (local development) browsers reject `SameSite=None`, so we fall back to
 * `lax`.
 */
const derivedSameSite = ((): 'lax' | 'strict' | 'none' => {
  if (raw.SESSION_COOKIE_SAME_SITE) return raw.SESSION_COOKIE_SAME_SITE;
  if (isProduction) return 'none';
  return 'lax';
})();

export const env = {
  ...raw,
  isProduction,
  isTest,
  isDevelopment: raw.NODE_ENV === 'development',
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  mongoUri: raw.MONGODB_URI,
  telegramBotToken: raw.TELEGRAM_BOT_TOKEN,
  telegramEd25519PublicKey: raw.TELEGRAM_ED25519_PUBLIC_KEY,
  telegramAuthMaxAgeSeconds: raw.TELEGRAM_AUTH_MAX_AGE_SECONDS,
  sessionSecret: raw.SESSION_SECRET,
  sessionTtlMs: raw.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  sessionCookieName: raw.SESSION_COOKIE_NAME,
  sessionCookieSameSite: derivedSameSite,
  cookieSecure: isProduction && !raw.ALLOW_INSECURE_COOKIES,
  allowedOrigins: raw.FRONTEND_URL,
  authRateLimit: {
    max: raw.AUTH_RATE_LIMIT,
    windowMs: raw.AUTH_RATE_LIMIT_WINDOW_MS,
  },
  trustProxyHops: raw.TRUST_PROXY_HOPS,
  logLevel: raw.LOG_LEVEL,
  serverRoot,
} as const;

export type Env = typeof env;
