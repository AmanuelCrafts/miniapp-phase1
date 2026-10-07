import { NextResponse } from 'next/server';
import { connectDatabase } from '../../../../server/src/config/database.js';
import { env } from '../../../../server/src/config/env.js';
import { authenticateWithTelegram } from '../../../../server/src/services/auth.service.js';
import { AppError } from '../../../../server/src/utils/AppError.js';
import { telegramAuthSchema } from '../../../../server/src/utils/schemas.js';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await connectDatabase();

    const body = await request.json().catch(() => null);
    const parsed = telegramAuthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
        { status: 400 },
      );
    }

    const result = await authenticateWithTelegram({
      initData: parsed.data.initData,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ip: request.headers.get('x-forwarded-for') ?? undefined,
    });

    const response = NextResponse.json({ user: result.user });
    response.cookies.set(env.sessionCookieName, result.session.cookieValue, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.sessionCookieSameSite,
      path: '/',
      expires: result.session.expiresAt,
    });

    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.expose ? error.message : 'Internal server error' } },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 },
    );
  }
}
