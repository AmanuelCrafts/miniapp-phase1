/**
 * Runtime-validated frontend configuration.
 *
 * Only public values live here. The Telegram bot token and the session secret
 * stay on the server; there is deliberately no way to read them from the client.
 */

const API_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function readApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  // In production (single-origin Vercel deploy) we call relative /api paths.
  if (process.env.NODE_ENV === 'production') {
    if (raw && raw.trim() !== '') {
      const cleaned = raw.replace(/\/+$/, '');
      if (API_URL_PATTERN.test(cleaned)) return cleaned;
    }
    return '';
  }

  if (!raw || !API_URL_PATTERN.test(raw)) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is missing or invalid. Copy client/.env.example to client/.env.local and set it to your API origin (e.g. http://localhost:4000).',
    );
  }

  // Normalise away a trailing slash so `${baseUrl}/api/...` never doubles up.
  return raw.replace(/\/+$/, '');
}

export const config = {
  apiUrl: readApiUrl(),
  requestTimeoutMs: 15_000,
} as const;
