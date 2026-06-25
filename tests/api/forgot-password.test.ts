import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  getClientIp: () => '203.0.113.7',
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
  },
}));

// side-effects ส่งหลัง response — no-op เพื่อไม่ยิงจริง และเลี่ยง after() นอก request scope
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (_fn: () => unknown) => {} };
});
vi.mock('@/lib/line', () => ({ sendLineOAMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  resetPasswordEmailHtml: () => '<html></html>',
}));

import { POST } from '@/app/api/auth/forgot-password/route';

const makeReq = (body: unknown) =>
  new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4, retryAfterMs: 0 });
  mocks.userUpdate.mockResolvedValue({});
});

describe('POST /api/auth/forgot-password — anti-enumeration', () => {
  it('โดน rate limit → 429', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 1000 });
    const res = await POST(makeReq({ email: 'a@b.com' }));
    expect(res.status).toBe(429);
  });

  it('SECURITY: อีเมลไม่มีในระบบ → 200 generic, ไม่สร้าง token', async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ email: 'ghost@nowhere.com' }));
    expect(res.status).toBe(200);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('SECURITY: บัญชี LINE-only (ไม่มี password) → 200 generic, ไม่สร้าง token', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'u1', password: null, name: 'x' });
    const res = await POST(makeReq({ email: 'line@user.com' }));
    expect(res.status).toBe(200);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('SECURITY: อีเมลรูปแบบผิด → 200 generic, ไม่แตะ DB', async () => {
    const res = await POST(makeReq({ email: 'not-an-email' }));
    expect(res.status).toBe(200);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it('ข้อความตอบกลับเหมือนกันทั้งกรณีมี/ไม่มี user (กันเดาว่าอีเมลมีจริง)', async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null);
    const msgGhost = (await (await POST(makeReq({ email: 'ghost@x.com' }))).json()).message;

    mocks.userFindUnique.mockResolvedValueOnce({ id: 'u1', password: 'hash', name: 'จริง', lineUserId: null, lineChannelAccessToken: null });
    const msgReal = (await (await POST(makeReq({ email: 'real@x.com' }))).json()).message;

    expect(msgGhost).toBe(msgReal);
  });
});

describe('POST /api/auth/forgot-password — token creation', () => {
  it('SECURITY: user จริง → เก็บเฉพาะ sha256(token) (ความยาว 64 hex) + ตั้งวันหมดอายุ', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'u1', password: 'hash', name: 'จริง', lineUserId: null, lineChannelAccessToken: null });
    const res = await POST(makeReq({ email: 'real@x.com' }));
    expect(res.status).toBe(200);

    const data = mocks.userUpdate.mock.calls[0][0].data;
    expect(data.resetTokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex — ไม่ใช่ token ดิบ
    expect(data.resetTokenExpiry).toBeInstanceOf(Date);
    expect(data.resetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('normalize email เป็น lowercase + trim ก่อน query', async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    await POST(makeReq({ email: '  Real@X.COM  ' }));
    expect(mocks.userFindUnique.mock.calls[0][0].where.email).toBe('real@x.com');
  });
});
