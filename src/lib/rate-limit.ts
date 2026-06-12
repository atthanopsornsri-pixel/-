/**
 * Rate limiter — Upstash Redis (distributed) พร้อม in-memory fallback
 *
 * ถ้าตั้ง UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN:
 *   → ใช้ Upstash sliding window (ทำงานข้าม Vercel Lambda instances)
 * ถ้าไม่ได้ตั้งค่า:
 *   → fallback เป็น in-memory (per-instance, ยังดีกว่าไม่มีเลย)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash instance (lazy, สร้างครั้งเดียว) ────────────────────────────────
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// Cache ของ Ratelimit instances ตาม key pattern
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(id: string, max: number, windowSec: number): Ratelimit {
  const cacheKey = `${id}:${max}:${windowSec}`;
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!;
  const redis = getRedis()!;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    prefix: `jh_rl:${id}`,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ── In-memory fallback ────────────────────────────────────────────────────────
interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>();
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memStore) if (v.resetAt < now) memStore.delete(k);
}, 60_000);
cleanup.unref?.();

function memRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || entry.resetAt < now) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key       unique identifier เช่น `register:${ip}`
 * @param max       จำนวนสูงสุดใน window
 * @param windowMs  ระยะเวลา window (milliseconds)
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return memRateLimit(key, max, windowMs);
  }

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const limiter = getUpstashLimiter(key.split(":")[0], max, windowSec);
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      allowed: success,
      remaining,
      retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()),
    };
  } catch {
    // Upstash unreachable → fallback in-memory
    return memRateLimit(key, max, windowMs);
  }
}

/** ดึง IP จาก Next.js Request headers (รองรับ Vercel proxy) */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
