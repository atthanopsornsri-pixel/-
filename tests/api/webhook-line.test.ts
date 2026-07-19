import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  tenantUpdateMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  tenantFindFirst: vi.fn(),
  sendLineOAMessage: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: mocks.userFindFirst, update: mocks.userUpdate },
    tenant: {
      updateMany: mocks.tenantUpdateMany,
      findUnique: mocks.tenantFindUnique,
      findFirst: mocks.tenantFindFirst,
    },
  },
}));
vi.mock('@/lib/line', () => ({ sendLineOAMessage: mocks.sendLineOAMessage }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rateLimit }));

import { POST } from '@/app/api/webhook/line/route';

const SECRET = 'line-channel-secret-xyz';
const sign = (body: string, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(body).digest('base64');

const makeReq = (rawBody: string, signature: string | null) =>
  new Request('http://localhost/api/webhook/line', {
    method: 'POST',
    headers: signature == null ? {} : { 'x-line-signature': signature },
    body: rawBody,
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendLineOAMessage.mockResolvedValue(undefined);
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4, retryAfterMs: 0 });
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/webhook/line — signature verification (SECURITY)', () => {
  beforeEach(() => vi.stubEnv('LINE_CHANNEL_SECRET', SECRET));

  it('ไม่มี signature header → 403', async () => {
    const body = JSON.stringify({ events: [] });
    const res = await POST(makeReq(body, null));
    expect(res.status).toBe(403);
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
  });

  it('signature ผิด (ความยาวเท่ากันแต่ค่าไม่ตรง) → 403', async () => {
    const body = JSON.stringify({ events: [] });
    const valid = sign(body);
    // พลิก char แรกแต่คงความยาว (เลี่ยง timingSafeEqual throw)
    const tampered = (valid[0] === 'A' ? 'B' : 'A') + valid.slice(1);
    const res = await POST(makeReq(body, tampered));
    expect(res.status).toBe(403);
  });

  it('signature ถูกต้อง + events ว่าง → 200 OK', async () => {
    const body = JSON.stringify({ events: [] });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(200);
  });

  it('signature ที่เซ็นด้วย secret อื่น → 403 (กันปลอม)', async () => {
    const body = JSON.stringify({ events: [] });
    const res = await POST(makeReq(body, sign(body, 'attacker-secret')));
    expect(res.status).toBe(403);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhook/line — account binding (signature ถูกต้อง)', () => {
  beforeEach(() => vi.stubEnv('LINE_CHANNEL_SECRET', SECRET));

  it('รหัส JAD-XXXX ที่ตรง user (ยังไม่หมดอายุ) → ผูก lineUserId + ล้าง bindingCode', async () => {
    mocks.userFindFirst.mockResolvedValue({ id: 'u1', name: 'เจ้าของ', role: 'OWNER', lineChannelAccessToken: null });
    const body = JSON.stringify({
      events: [{ type: 'message', message: { type: 'text', text: 'jad-ab12' }, source: { userId: 'U_line_123' } }],
    });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(200);
    // where ต้องมีทั้งรหัส + เงื่อนไขยังไม่หมดอายุ (H02)
    expect(mocks.userFindFirst).toHaveBeenCalledWith({
      where: { lineBindingCode: 'JAD-AB12', lineBindingCodeExpiresAt: { gt: expect.any(Date) } },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { lineUserId: 'U_line_123', lineBindingCode: null, lineBindingCodeExpiresAt: null },
      }),
    );
  });

  it('rate-limit เกิน → ไม่ค้นหา/ผูกบัญชี (กัน brute-force, H02)', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 60000 });
    const body = JSON.stringify({
      events: [{ type: 'message', message: { type: 'text', text: 'JAD-AB12' }, source: { userId: 'U_x' } }],
    });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(200); // ตอบ 200 แต่ไม่ทำอะไร (ไม่บอกใบ้)
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
  });

  it('รหัสผูกไม่ตรง user ใด → ไม่ update อะไร แต่ยังตอบ 200', async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    const body = JSON.stringify({
      events: [{ type: 'message', message: { type: 'text', text: 'JAD-NOPE' }, source: { userId: 'U_x' } }],
    });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(200);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});
