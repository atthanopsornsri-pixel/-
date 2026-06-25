import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock dependencies (vi.mock ถูก hoist — state ต้องห่อด้วย vi.hoisted) ──────────
const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  codeFindUnique: vi.fn(),
  codeUpdate: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  getClientIp: () => '203.0.113.1',
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    registrationCode: { findUnique: mocks.codeFindUnique, update: mocks.codeUpdate },
  },
}));

import { POST } from '@/app/api/auth/register/route';

const makeReq = (body: unknown) =>
  new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = { email: 'Owner@Example.com', password: 'secret123', name: 'เจ้าของหอ' };

beforeEach(() => {
  vi.clearAllMocks();
  // ค่า default: ผ่าน rate limit + ไม่มี user เดิม
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4, retryAfterMs: 0 });
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.userCreate.mockResolvedValue({ id: 'usr_1', email: 'owner@example.com' });
});

describe('POST /api/auth/register — rate-limit gate', () => {
  it('โดน rate limit → 429 พร้อม Retry-After header', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 90_000 });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('90');
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/register — validation', () => {
  it('ไม่มี email → 400', async () => {
    const res = await POST(makeReq({ ...validBody, email: '' }));
    expect(res.status).toBe(400);
  });

  it('password สั้นกว่า 6 ตัว → 400', async () => {
    const res = await POST(makeReq({ ...validBody, password: '123' }));
    expect(res.status).toBe(400);
  });

  it('ไม่มี name → 400', async () => {
    const res = await POST(makeReq({ ...validBody, name: '   ' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register — duplicate', () => {
  it('อีเมลซ้ำ → 400 และไม่สร้าง user', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'existing', email: 'owner@example.com' });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/register — happy path', () => {
  it('สมัครสำเร็จ → 201 + body มี id/email', async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      user: { id: 'usr_1', email: 'owner@example.com' },
    });
  });

  it('normalize email เป็น lowercase ก่อนเช็คซ้ำและบันทึก', async () => {
    await POST(makeReq(validBody));
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { email: 'owner@example.com' } });
    expect(mocks.userCreate.mock.calls[0][0].data.email).toBe('owner@example.com');
  });

  it('SECURITY: เก็บรหัสผ่านแบบ hash (bcrypt) ไม่ใช่ plaintext', async () => {
    await POST(makeReq(validBody));
    const savedPassword = mocks.userCreate.mock.calls[0][0].data.password;
    expect(savedPassword).not.toBe('secret123');
    expect(savedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash signature
  });

  it('ไม่มี registration code → role OWNER, planTier FREE_TRIAL', async () => {
    await POST(makeReq(validBody));
    const data = mocks.userCreate.mock.calls[0][0].data;
    expect(data.role).toBe('OWNER');
    expect(data.planTier).toBe('FREE_TRIAL');
    expect(mocks.codeUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/register — registration code', () => {
  it('โค้ดถูกต้องและยังไม่ถูกใช้ → planTier STARTER + mark โค้ดว่าใช้แล้ว', async () => {
    mocks.codeFindUnique.mockResolvedValue({ id: 'code_1', code: 'WELCOME', isUsed: false, months: 3 });
    const res = await POST(makeReq({ ...validBody, registrationCode: 'WELCOME' }));
    expect(res.status).toBe(201);
    expect(mocks.userCreate.mock.calls[0][0].data.planTier).toBe('STARTER');
    expect(mocks.codeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'code_1' },
        data: expect.objectContaining({ isUsed: true, usedById: 'usr_1' }),
      }),
    );
  });

  it('โค้ดถูกใช้ไปแล้ว → 400 และไม่สร้าง user', async () => {
    mocks.codeFindUnique.mockResolvedValue({ id: 'code_1', code: 'USED', isUsed: true, months: 3 });
    const res = await POST(makeReq({ ...validBody, registrationCode: 'USED' }));
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('โค้ดไม่มีในระบบ → 400', async () => {
    mocks.codeFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ ...validBody, registrationCode: 'NOPE' }));
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/register — DB error', () => {
  it('create ล้มเหลว → 500 (ไม่ throw หลุด)', async () => {
    mocks.userCreate.mockRejectedValue(new Error('Can not reach database server'));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty('message');
  });

  it('Prisma P2002 (email ซ้ำระดับ DB) → 500 พร้อมข้อความเฉพาะ', async () => {
    mocks.userCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toContain('อีเมล');
  });
});
