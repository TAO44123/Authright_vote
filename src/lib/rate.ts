import type { NextRequest } from "next/server";
import { PollError } from "@/lib/polls";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 10000) {
    for (const [name, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(name);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new PollError(429, "操作过于频繁，请稍后再试", "RATE_LIMIT");
}

export function clientAddress(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
