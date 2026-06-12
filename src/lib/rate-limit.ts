/**
 * Simple in-process rate limiter (IP-based, sliding window)
 *
 * ใช้ for: register, contact form, test-SMS endpoints
 * ข้อจำกัด: ไม่ shared ข้าม Vercel Lambda instances — แต่ยังดีกว่าไม่มีเลย
 * สำหรับ production scale ควรเปลี่ยนเป็น Upstash Redis
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Cleanup expired entries every minute
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}, 60_000);
cleanup.unref?.(); // ไม่บล็อก process exit

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key       unique key เช่น `register:${ip}` หรือ `sms-test:${userId}`
 * @param max       จำนวนสูงสุดที่อนุญาตใน window
 * @param windowMs  ระยะเวลา window (ms)
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
}

/** ดึง IP จาก Next.js Request headers (รองรับ Vercel proxy) */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
