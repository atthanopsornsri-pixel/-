import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  billFindUnique: vi.fn(),
  billUpdate: vi.fn(),
  tenantFindUnique: vi.fn(),
  getServerSession: vi.fn(),
  verifySlip: vi.fn(),
  receiverMatchesPromptPay: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bill: { findUnique: mocks.billFindUnique, update: mocks.billUpdate },
    tenant: { findUnique: mocks.tenantFindUnique },
  },
}));
vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/slip-verification', () => ({
  verifySlip: mocks.verifySlip,
  receiverMatchesPromptPay: mocks.receiverMatchesPromptPay,
}));
vi.mock('@/lib/line', () => ({ sendLineOAMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (_fn: () => unknown) => {} };
});

import { PATCH } from '@/app/api/bills/[id]/pay/route';

const ctx = { params: Promise.resolve({ id: 'bill_1' }) };
const makeReq = (body: unknown) =>
  new Request('http://localhost/api/bills/bill_1/pay', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const baseBill = () => ({
  id: 'bill_1',
  status: 'UNPAID',
  totalAmount: 1500,
  paidAmount: 0,
  roomId: 'room_1',
  room: {
    number: '101',
    property: { promptPayNo: '0640353806', owner: { lineUserId: null, lineChannelAccessToken: null } },
  },
});

const callData = () => mocks.billUpdate.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.billFindUnique.mockResolvedValue(baseBill());
  mocks.billUpdate.mockImplementation(async (a: any) => ({ id: 'bill_1', ...a.data }));
  mocks.getServerSession.mockResolvedValue(null); // public flow ปกติ
  mocks.verifySlip.mockResolvedValue({ enabled: false, verified: false }); // manual fallback
  mocks.receiverMatchesPromptPay.mockReturnValue(true);
});

describe('PATCH /api/bills/[id]/pay — validation & state', () => {
  it('ไม่มี slipUrl → 400', async () => {
    const res = await PATCH(makeReq({}), ctx);
    expect(res.status).toBe(400);
  });

  it('ไม่พบบิล → 404', async () => {
    mocks.billFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(404);
  });

  it('บิลจ่ายแล้ว (PAID) → 400 ไม่อัปเดต', async () => {
    mocks.billFindUnique.mockResolvedValue({ ...baseBill(), status: 'PAID' });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(400);
    expect(mocks.billUpdate).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/bills/[id]/pay — anti cross-room (SECURITY)', () => {
  it('TENANT จ่ายบิลที่ไม่ใช่ห้องตัวเอง → 403', async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: 'tenant_x', role: 'TENANT' } });
    mocks.tenantFindUnique.mockResolvedValue({ roomId: 'room_OTHER' });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(403);
    expect(mocks.billUpdate).not.toHaveBeenCalled();
  });

  it('TENANT จ่ายบิลห้องตัวเอง → ผ่าน', async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: 'tenant_1', role: 'TENANT' } });
    mocks.tenantFindUnique.mockResolvedValue({ roomId: 'room_1' });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/bills/[id]/pay — slip verification (SECURITY)', () => {
  it('สลิปซ้ำ → 400 DUPLICATE_SLIP ไม่อัปเดตบิล', async () => {
    mocks.verifySlip.mockResolvedValue({ enabled: true, verified: false, duplicate: true });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('DUPLICATE_SLIP');
    expect(mocks.billUpdate).not.toHaveBeenCalled();
  });

  it('ยอดไม่ตรง → 400 AMOUNT_MISMATCH ไม่อัปเดตบิล', async () => {
    mocks.verifySlip.mockResolvedValue({ enabled: true, verified: false, amountMismatch: true, amount: 1000 });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('AMOUNT_MISMATCH');
    expect(mocks.billUpdate).not.toHaveBeenCalled();
  });

  it('ตรวจผ่าน + บัญชีตรง + ยอดครบ → ปิดบิล PAID อัตโนมัติ', async () => {
    mocks.verifySlip.mockResolvedValue({ enabled: true, verified: true, amount: 1500, receiverAccount: 'xxx3806' });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(200);
    expect(callData().status).toBe('PAID');
    expect(callData().paidAmount).toBe(1500);
    expect((await res.json()).autoVerified).toBe(true);
  });

  it('ตรวจผ่าน + จ่ายไม่ครบ → PARTIAL ตามยอดสลิป', async () => {
    mocks.verifySlip.mockResolvedValue({ enabled: true, verified: true, amount: 500, receiverAccount: 'xxx3806' });
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(200);
    expect(callData().status).toBe('PARTIAL');
    expect(callData().paidAmount).toBe(500);
  });

  it('SECURITY: ตรวจผ่านยอดครบ แต่บัญชีผู้รับไม่ตรงพร้อมเพย์ → ไม่ auto-close, ตกเป็น PENDING', async () => {
    mocks.verifySlip.mockResolvedValue({ enabled: true, verified: true, amount: 1500, receiverAccount: 'xxx9999' });
    mocks.receiverMatchesPromptPay.mockReturnValue(false);
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(200);
    expect(callData().status).toBe('PENDING');
    expect((await res.json()).autoVerified).toBe(false);
  });

  it('provider ปิด (manual) → บันทึกสลิปเป็น PENDING รอเจ้าของตรวจ', async () => {
    const res = await PATCH(makeReq({ slipUrl: 'data:image/jpeg;base64,AA' }), ctx);
    expect(res.status).toBe(200);
    expect(callData().status).toBe('PENDING');
  });
});
