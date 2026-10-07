/**
 * Isolated in-memory sliding-window rate limiter.
 *
 * NOTE: this lives in a single process and resets on restart. It is
 * deliberately isolated behind this small interface so it can be replaced by
 * Redis (or another shared store) for horizontally scaled deployments without
 * touching call sites.
 */

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

const MAX_TRACKED_BUCKETS = 10_000;

function pruneBucket(bucket: Bucket, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  while (bucket.timestamps.length > 0 && bucket.timestamps[0]! <= cutoff) {
    bucket.timestamps.shift();
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup to keep memory bounded.
  if (buckets.size > MAX_TRACKED_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      pruneBucket(bucket, now, windowMs);
      if (bucket.timestamps.length === 0) buckets.delete(bucketKey);
    }
  }

  const bucket = buckets.get(key) ?? { timestamps: [] };
  pruneBucket(bucket, now, windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0]!;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1_000),
    );
    buckets.set(key, bucket);
    return { success: false, remaining: 0, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  return {
    success: true,
    remaining: limit - bucket.timestamps.length,
    retryAfterSeconds: 0,
  };
}
