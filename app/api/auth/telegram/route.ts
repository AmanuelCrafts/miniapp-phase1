import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { verifyTelegramInitData } from '@/lib/telegram/verifyInitData';
import { UserModel, type IUser } from '@/models/User';
import { createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isRateLimited } from '@/lib/auth/rateLimit';

const telegramAuthSchema = z.object({
  initData: z.string().min(1).max(8192),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = telegramAuthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 },
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const maxAge = Number(process.env.TELEGRAM_AUTH_MAX_AGE ?? 86400);

    if (!botToken) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 },
      );
    }

    const verified = verifyTelegramInitData(parsed.data.initData, botToken, maxAge);

    await connectDB();

    const telegramId = String(verified.user.id);
    let user: IUser | null = await UserModel.findOne({ telegramId }).lean();

    if (!user) {
      const created = await UserModel.create({
        telegramId,
        firstName: verified.user.first_name || 'Telegram User',
        lastName: verified.user.last_name ?? undefined,
        username: verified.user.username ?? undefined,
        avatarUrl: verified.user.photo_url ?? undefined,
        status: 'ACTIVE',
      });
      user = created.toObject() as IUser;
    } else {
      await UserModel.updateOne(
        { telegramId },
        {
          $set: {
            firstName: verified.user.first_name || user.firstName,
            lastName: verified.user.last_name ?? user.lastName ?? null,
            username: verified.user.username ?? user.username ?? null,
            avatarUrl: verified.user.photo_url ?? user.avatarUrl ?? null,
          },
        },
      );
    }

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account suspended' },
        { status: 403 },
      );
    }

    const sessionToken = await createSession(user._id.toString());

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        telegramId: user.telegramId,
        username: user.username ?? null,
        firstName: user.firstName,
        lastName: user.lastName ?? null,
        avatarUrl: user.avatarUrl ?? null,
        status: user.status,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    console.error('Auth error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 },
    );
  }
}
