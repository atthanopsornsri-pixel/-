import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// ไม่ตั้ง UPSTASH_* → rateLimit จะใช้ in-memory fallback (memRateLimit)
describe('rateLimit (in-memory fallback)', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', undefined);
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('คำขอแรกผ่าน และ remaining ลดลงตามจำนวนครั้ง', async () => {
    const key = `unit-test-first:${Math.random()}`;
    const r1 = await rateLimit(key, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await rateLimit(key, 3, 60_000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it('เกิน max → block พร้อม retryAfterMs > 0', async () => {
    const key = `unit-test-block:${Math.random()}`;
    await rateLimit(key, 2, 60_000); // 1
    await rateLimit(key, 2, 60_000); // 2 (ถึงเพดาน)
    const blocked = await rateLimit(key, 2, 60_000); // 3 → เกิน
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('window หมดอายุ → reset แล้วอนุญาตอีกครั้ง', async () => {
    vi.useFakeTimers();
    try {
      const key = `unit-test-window:${Math.random()}`;
      const first = await rateLimit(key, 1, 1_000);
      expect(first.allowed).toBe(true);

      const blocked = await rateLimit(key, 1, 1_000);
      expect(blocked.allowed).toBe(false);

      vi.setSystemTime(Date.now() + 1_500); // เลย window
      const afterReset = await rateLimit(key, 1, 1_000);
      expect(afterReset.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('key ต่างกันนับแยกกัน', async () => {
    const a = await rateLimit(`unit-a:${Math.random()}`, 1, 60_000);
    const b = await rateLimit(`unit-b:${Math.random()}`, 1, 60_000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('ใช้ตัวแรกของ x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('203.0.113.9');
  });

  it('fallback ไป x-real-ip เมื่อไม่มี x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.7' },
    });
    expect(getClientIp(req)).toBe('198.51.100.7');
  });

  it('ไม่มี header ใด → "unknown"', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });
});
