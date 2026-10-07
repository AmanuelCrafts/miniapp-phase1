import mongoose from "mongoose";
import { requireEnv } from "@/lib/env";

/**
 * Reusable MongoDB connection with the standard Next.js caching pattern.
 * During development, hot reloads re-evaluate modules; the cached promise on
 * `globalThis` guarantees a single connection per process.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as {
  __birrlyMongoose?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose.__birrlyMongoose ?? { conn: null, promise: null };

globalForMongoose.__birrlyMongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = requireEnv("MONGODB_URI");
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
