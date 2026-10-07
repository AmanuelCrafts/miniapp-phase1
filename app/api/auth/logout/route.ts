import { NextResponse } from 'next/server';
import { deleteSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST() {
  try {
    await deleteSession();

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
