import { NextResponse } from 'next/server';
import { connectDatabase, getDatabaseState } from '../../../../server/src/config/database.js';
import { env } from '../../../../server/src/config/env.js';

export async function GET(): Promise<NextResponse> {
  try {
    await connectDatabase();
    const database = getDatabaseState();

    return NextResponse.json({
      status: database === 'connected' ? 'ok' : 'degraded',
      database,
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', environment: env.nodeEnv },
      { status: 503 },
    );
  }
}
