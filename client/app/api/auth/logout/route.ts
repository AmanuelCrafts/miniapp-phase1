import { NextResponse } from 'next/server';
import { connectDatabase } from '../../../../server/src/config/database.js';
import { env } from '../../../../server/src/config/env.js';
import { destroySession } from '../../../../server/src/services/session.service.js';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await connectDatabase();

    const cookieHeader = request.headers.get('cookie') ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      }),
    );

    await destroySession(cookies[env.sessionCookieName]);

    const response = NextResponse.json({ success: true });
    response.cookies.set(env.sessionCookieName, '', {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.sessionCookieSameSite,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 },
    );
  }
}
