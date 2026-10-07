import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Small typed-error convention for route handlers. Anything thrown that is
 * not an ApiError is logged server-side and reported to the client as a
 * generic 500 — stack traces, Mongo errors and secrets never leave the box.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonOk<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function route(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.status, error.code, error.message);
      }
      if (error instanceof ZodError) {
        return jsonError(400, "bad_request", "Invalid request.");
      }
      console.error("[api] Unhandled error:", error);
      return jsonError(500, "internal_error", GENERIC_ERROR_MESSAGE);
    }
  };
}

/** Best-effort client IP for rate limiting (behind proxies/CDNs). */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
