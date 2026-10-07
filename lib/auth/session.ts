import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Types } from "mongoose";
import { requireEnv, getEnvNumber } from "@/lib/env";
import { connectDB } from "@/lib/mongodb";
import Session, { type SessionDocument } from "@/models/Session";
import User, { type UserDocument } from "@/models/User";
import { toPublicUser } from "@/services/auth.service";
import type { PublicUser } from "@/types/auth";

/**
 * Server-side session system.
 *
 * - Tokens are cryptographically random; ONLY their SHA-256 hash (peppered
 *   with SESSION_SECRET) is stored in MongoDB.
 * - The raw token lives exclusively in an HTTP-only cookie.
 * - Expired sessions are rejected on lookup; a TTL index removes them from
 *   MongoDB automatically.
 */

export const SESSION_COOKIE_NAME = "session";

export function getSessionMaxAge(): number {
  return getEnvNumber("SESSION_MAX_AGE", 604_800);
}

/** Cryptographically secure session token (raw — cookie only, never stored). */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Store only this value: SHA-256(token + SESSION_SECRET). */
export function hashSessionToken(token: string): string {
  const pepper = requireEnv("SESSION_SECRET");
  return crypto
    .createHash("sha256")
    .update(`${token}.${pepper}`)
    .digest("hex");
}

export async function createSession(
  userId: Types.ObjectId | string,
): Promise<{ token: string; expiresAt: Date }> {
  await connectDB();
  const token = generateSessionToken();
  const maxAge = getSessionMaxAge();
  const expiresAt = new Date(Date.now() + maxAge * 1_000);

  await Session.create({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function findSessionByToken(
  token: string,
): Promise<SessionDocument | null> {
  await connectDB();
  return Session.findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  });
}

export async function deleteSession(token: string): Promise<void> {
  await connectDB();
  await Session.deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function readSessionCookieToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Resolve the current authenticated user from the session cookie.
 * Cached per request so layout + pages share one lookup.
 *
 * Resilience: a transient database error here would crash every page into
 * the global error boundary. Instead we log and treat the caller as
 * unauthenticated — the AuthGate then shows a branded, retryable state.
 */
export const getCurrentSessionUser = cache(async (): Promise<{
  session: SessionDocument;
  user: UserDocument;
} | null> => {
  const token = await readSessionCookieToken();
  if (!token) return null;

  try {
    const session = await findSessionByToken(token);
    if (!session) return null;

    const user = await User.findById(session.userId).populate(
      "currentVipPlan",
      "level",
    );
    if (!user || user.status === "SUSPENDED") return null;

    return { session, user };
  } catch (error) {
    console.error("[session] lookup failed (treating as unauthenticated):", error);
    return null;
  }
});

/** Convenience wrapper returning the sanitized public user (or null). */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const result = await getCurrentSessionUser();
  if (!result) return null;
  return toPublicUser(result.user);
});

/** Invalidate the caller's session and clear the cookie. Idempotent. */
export async function deleteCurrentSession(): Promise<void> {
  const token = await readSessionCookieToken();
  if (token) {
    try {
      await deleteSession(token);
    } catch {
      // Even if the DB delete fails, clear the cookie so the client
      // can no longer authenticate with it.
    }
  }
  await clearSessionCookie();
}
