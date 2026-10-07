import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

/**
 * GET /api/health — actually tests MongoDB connectivity with a ping.
 * Exposes no credentials or internal error details.
 */
export async function GET() {
  try {
    await connectDB();
    await mongoose.connection.db?.admin().command({ ping: 1 });
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("[health] MongoDB check failed:", error);
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 500 },
    );
  }
}
