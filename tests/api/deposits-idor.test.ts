import { describe, it, expect, beforeEach, vi } from 'vitest';

// ปิด gap ของ high-impact.test.ts: ทดสอบ IDOR-null path ของ deposit mutations
// (tenant ของ owner คนอื่น → getSecurePrisma().tenant.findUnique คืน null → ปฏิเสธ ไม่ update)
const h = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  tenantFindUnique: vi.fn(),
  tenantUpdate: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma-secure', () => ({
  getSecurePrisma: vi.fn().mockResolvedValue({
    tenant: { findUnique: h.tenantFindUnique, update: h.tenantUpdate },
  }),
}));

import { processDepositRefund, processDepositDeduction } from '@/app/actions/deposits';

beforeEach(() => {
  vi.clearAllMocks();
  h.getServerSession.mockResolvedValue({ user: { id: 'owner-A', role: 'OWNER' } });
  // RLS: tenant ของ owner คนอื่น → findUnique (แปลงเป็น findFirst ผูก ownerId) คืน null
  h.tenantFindUnique.mockResolvedValue(null);
});

describe('Deposit mutations — IDOR (tenant ของ owner คนอื่น)', () => {
  it('SECURITY: processDepositRefund → findUnique null → "ไม่มีสิทธิ์" ไม่ update', async () => {
    const res = await processDepositRefund('tenant-of-other-owner', 1000);
    expect(res.success).toBe(false);
    expect(res.error).toContain('ไม่มีสิทธิ์');
    expect(h.tenantUpdate).not.toHaveBeenCalled();
  });

  it('SECURITY: processDepositDeduction → findUnique null → "ไม่มีสิทธิ์" ไม่ update', async () => {
    const res = await processDepositDeduction('tenant-of-other-owner', 1000, 'ค่าเสียหาย');
    expect(res.success).toBe(false);
    expect(res.error).toContain('ไม่มีสิทธิ์');
    expect(h.tenantUpdate).not.toHaveBeenCalled();
  });
});
