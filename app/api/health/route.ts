import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  try {
    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json(
        { status: 'error', database: 'disconnected' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    return NextResponse.json(
      { status: 'error', database: 'disconnected' },
      { status: 500 },
    );
  }
}
