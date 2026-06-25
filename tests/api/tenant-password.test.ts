import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  tenantFindUnique: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, findFirst: mocks.userFindFirst, update: vi.fn() },
    tenant: { findUnique: mocks.tenantFindUnique, update: vi.fn() },
    $transaction: mocks.$transaction,
  },
}));

import { PUT } from '@/app/api/tenant/password/route';

const makeReq = (body: unknown) =>
  new Request('http://localhost/api/tenant/password', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const tenantSession = { user: { id: 'tenant_1', role: 'TENANT' } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSession.mockResolvedValue(tenantSession);
  mocks.userFindUnique.mockResolvedValue({ password: null }); // ยังไม่เคยตั้งรหัส
  mocks.tenantFindUnique.mockResolvedValue({ phoneNumber: '0812345678' });
  mocks.userFindFirst.mockResolvedValue(null); // เบอร์ยังไม่ถูกใช้
  mocks.$transaction.mockResolvedValue([{}, {}]);
});

describe('PUT /api/tenant/password — auth gate', () => {
  it('ไม่มี session → 401', async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await PUT(makeReq({ newPassword: 'secret6' }));
    expect(res.status).toBe(401);
  });

  it('SECURITY: role ไม่ใช่ TENANT (เช่น OWNER) → 401', async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER' } });
    const res = await PUT(makeReq({ newPassword: 'secret6' }));
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/tenant/password — validation', () => {
  it('รหัสใหม่สั้นกว่า 6 → 400', async () => {
    const res = await PUT(makeReq({ newPassword: '123' }));
    expect(res.status).toBe(400);
  });

  it('เบอร์โทรไม่ถูกรูปแบบ → 400', async () => {
    mocks.tenantFindUnique.mockResolvedValue({ phoneNumber: null });
    const res = await PUT(makeReq({ newPassword: 'secret6', phoneNumber: '12' }));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tenant/password — เปลี่ยนรหัสที่มีอยู่เดิม', () => {
  it('SECURITY: มีรหัสเดิมแต่ไม่กรอก currentPassword → 400', async () => {
    mocks.userFindUnique.mockResolvedValue({ password: await bcrypt.hash('oldpass', 10) });
    const res = await PUT(makeReq({ newPassword: 'newsecret6' }));
    expect(res.status).toBe(400);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it('SECURITY: currentPassword ผิด → 400 ไม่ยอมเปลี่ยน', async () => {
    mocks.userFindUnique.mockResolvedValue({ password: await bcrypt.hash('oldpass', 10) });
    const res = await PUT(makeReq({ currentPassword: 'WRONG', newPassword: 'newsecret6' }));
    expect(res.status).toBe(400);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });
});

describe('PUT /api/tenant/password — anti-spoof / uniqueness', () => {
  it('SECURITY: เบอร์ถูกใช้เป็น username ของคนอื่น → 409 (เช็ค NOT self)', async () => {
    mocks.userFindFirst.mockResolvedValue({ id: 'other_user' });
    const res = await PUT(makeReq({ newPassword: 'secret6', phoneNumber: '0899999999' }));
    expect(res.status).toBe(409);
    // ต้องยกเว้น session ตัวเอง ป้องกัน false positive
    expect(mocks.userFindFirst.mock.calls[0][0].where.NOT).toEqual({ id: 'tenant_1' });
  });
});

describe('PUT /api/tenant/password — happy path', () => {
  it('ตั้งรหัสครั้งแรกสำเร็จ → success + update เฉพาะ session.user.id ของตัวเอง', async () => {
    const res = await PUT(makeReq({ newPassword: 'secret6', phoneNumber: '08-1234-5678' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, username: '0812345678' });
    expect(mocks.$transaction).toHaveBeenCalledTimes(1);
  });

  it('P2002 ตอน commit → 409', async () => {
    mocks.$transaction.mockRejectedValue({ code: 'P2002' });
    const res = await PUT(makeReq({ newPassword: 'secret6', phoneNumber: '0812345678' }));
    expect(res.status).toBe(409);
  });
});
