/**
 * Typed API client for the Express backend.
 *
 * Responsibilities:
 *  - always send cookies (`credentials: 'include'`) so the HTTP-only session
 *    cookie travels with every call;
 *  - normalise every failure into `ApiError` with a stable code;
 *  - validate responses with Zod so components never handle untyped data.
 */
import {
  apiErrorSchema,
  authUserResponseSchema,
  logoutResponseSchema,
  publicUserSchema,
  type PublicUser,
  type TelegramAuthRequest,
} from '@/types/api';
import { config } from '@/lib/config';

export type ApiErrorCode =
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
  | 'INTERNAL_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the session is missing, expired or otherwise not usable. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when Telegram rejected the initData. */
  get isTelegramDataProblem(): boolean {
    return this.code === 'INVALID_TELEGRAM_DATA' || this.code === 'EXPIRED_TELEGRAM_DATA';
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** True when the API could not be reached at all. */
  get isNetworkProblem(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string): string {
  return `${config.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Combines the caller's signal with a timeout signal. */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = (): void => controller.abort();
  signal?.addEventListener('abort', onAbort);

  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

async function parseErrorBody(response: Response): Promise<{ code: ApiErrorCode; message: string; details?: unknown }> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const parsed = apiErrorSchema.safeParse(payload);
  if (parsed.success) {
    return {
      code: parsed.data.error.code as ApiErrorCode,
      message: parsed.data.error.message,
      ...(parsed.data.error.details === undefined ? {} : { details: parsed.data.error.details }),
    };
  }

  return {
    code: response.status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST',
    message: response.statusText || `Request failed with status ${response.status}`,
  };
}

async function request<T>(
  path: string,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const timeout = withTimeout(signal, config.requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      // Required for the HTTP-only session cookie to be sent and stored.
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: timeout.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
  } finally {
    timeout.cancel();
  }

  if (!response.ok) {
    const { code, message, details } = await parseErrorBody(response);
    throw new ApiError(response.status, code, message, details);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned an unexpected response.');
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned an unexpected response.');
  }

  return parsed.data;
}

export const api = {
  auth: {
    /**
     * Exchanges Telegram `initData` for a session.
     * The backend verifies the data server side; the client never sends a
     * Telegram id of its own.
     */
    authenticateWithTelegram(payload: TelegramAuthRequest, signal?: AbortSignal): Promise<{ user: PublicUser }> {
      return request('/api/auth/telegram', authUserResponseSchema, {
        method: 'POST',
        body: payload,
        ...(signal ? { signal } : {}),
      });
    },

    /** Reads the currently authenticated user from the session cookie. */
    me(signal?: AbortSignal): Promise<{ user: PublicUser }> {
      return request('/api/auth/me', authUserResponseSchema, {
        method: 'GET',
        ...(signal ? { signal } : {}),
      });
    },

    /** Destroys the server side session and clears the cookie. */
    logout(signal?: AbortSignal): Promise<{ success: true }> {
      return request('/api/auth/logout', logoutResponseSchema, {
        method: 'POST',
        ...(signal ? { signal } : {}),
      });
    },
  },
} as const;

export { publicUserSchema };
