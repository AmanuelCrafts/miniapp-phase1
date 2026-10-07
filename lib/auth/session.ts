import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { SessionModel } from '@/models/Session';
import type { IUser } from '@/models/User';

const SESSION_COOKIE_NAME = 'birrly_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await SessionModel.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function getCurrentUser(): Promise<IUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await SessionModel.findOne({ tokenHash }).populate('userId').lean();

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await SessionModel.deleteOne({ _id: session._id });
    return null;
  }

  const user = session.userId as unknown as IUser;
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await SessionModel.deleteOne({ tokenHash: hashSessionToken(token) });
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  };
}

export { SESSION_COOKIE_NAME };
