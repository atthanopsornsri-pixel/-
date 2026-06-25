import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  getClientIp: () => '203.0.113.5',
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: mocks.userFindFirst, update: mocks.userUpdate },
  },
}));

import { POST } from '@/app/api/auth/reset-password/route';

const makeReq = (body: unknown) =>
  new Request('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 9, retryAfterMs: 0 });
  mocks.userFindFirst.mockResolvedValue({ id: 'usr_1' });
  mocks.userUpdate.mockResolvedValue({});
});

describe('POST /api/auth/reset-password', () => {
  it('โดน rate limit → 429', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 1000 });
    const res = await POST(makeReq({ token: 't', password: 'longenough8' }));
    expect(res.status).toBe(429);
  });

  it('ไม่มี token → 400', async () => {
    const res = await POST(makeReq({ token: '', password: 'longenough8' }));
    expect(res.status).toBe(400);
  });

  it('รหัสผ่านสั้นกว่า 8 → 400', async () => {
    const res = await POST(makeReq({ token: 'abc', password: 'short' }));
    expect(res.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('SECURITY: ค้นหา user ด้วย sha256(token) + token ยังไม่หมดอายุ (gt now)', async () => {
    await POST(makeReq({ token: 'raw-token-xyz', password: 'longenough8' }));
    const arg = mocks.userFindFirst.mock.calls[0][0];
    expect(arg.where.resetTokenHash).toBe(sha256('raw-token-xyz'));
    expect(arg.where.resetTokenExpiry).toHaveProperty('gt');
    expect(arg.where.resetTokenExpiry.gt).toBeInstanceOf(Date);
  });

  it('token ผิด/หมดอายุ (ไม่พบ user) → 400 และไม่ตั้งรหัสใหม่', async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    const res = await POST(makeReq({ token: 'expired', password: 'longenough8' }));
    expect(res.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('SECURITY: token ถูกต้อง → ตั้งรหัส (hash) + ล้าง token ทันที (ใช้ครั้งเดียว)', async () => {
    const res = await POST(makeReq({ token: 'good', password: 'brandnew-password' }));
    expect(res.status).toBe(200);
    const data = mocks.userUpdate.mock.calls[0][0].data;
    expect(data.password).not.toBe('brandnew-password');
    expect(data.password).toMatch(/^\$2[aby]\$/); // bcrypt
    expect(data.resetTokenHash).toBeNull();
    expect(data.resetTokenExpiry).toBeNull();
  });

  it('DB error → 500 (ไม่ throw หลุด)', async () => {
    mocks.userUpdate.mockRejectedValue(new Error('db down'));
    const res = await POST(makeReq({ token: 'good', password: 'longenough8' }));
    expect(res.status).toBe(500);
  });
});
