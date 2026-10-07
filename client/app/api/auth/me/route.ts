import { NextResponse } from 'next/server';
import { connectDatabase } from '../../../../server/src/config/database.js';
import { env } from '../../../../server/src/config/env.js';
import { resolveSession } from '../../../../server/src/services/session.service.js';
import { toPublicUser } from '../../../../server/src/utils/dto.js';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await connectDatabase();

    const cookieHeader = request.headers.get('cookie') ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      }),
    );

    const session = await resolveSession(cookies[env.sessionCookieName]);

    if (!session) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    return NextResponse.json({ user: toPublicUser(session.user) });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 },
    );
  }
}
