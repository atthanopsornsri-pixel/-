import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * RLS where-injection test (DB-free, faithful)
 * ──────────────────────────────────────────────
 * แทนที่จะต่อ DB จริง เรา capture "config" ที่ prisma-secure ส่งให้ $extends แล้ว
 * เรียก callback `$allOperations` ตรง ๆ ด้วย spy `query` → ตรวจว่า where ถูก inject
 * scope (ownerId/roomId/isDeleted) ก่อนส่งต่อให้ engine จริง
 */
const h = vi.hoisted(() => {
  const rec: { softDelete: any; rls: any } = { softDelete: null, rls: null };
  const finalClient = { __final: true };
  const extendedClient: any = {
    __soft: true,
    $extends: vi.fn((cfg: any) => { rec.rls = cfg; return finalClient; }),
    tenant: { findUnique: vi.fn() },
  };
  const prismaMock: any = {
    $extends: vi.fn((cfg: any) => { rec.softDelete = cfg; return extendedClient; }),
  };
  return { rec, extendedClient, prismaMock, getServerSession: vi.fn() };
});

vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: h.prismaMock }));

import { getSecurePrisma } from '@/lib/prisma-secure';

/** เรียก hook ของโมเดล + คืน spy query เพื่อตรวจ args สุดท้าย */
async function runModelHook(cfg: any, model: string, operation: string, args: any) {
  const query = vi.fn().mockResolvedValue([]);
  await cfg.query[model].$allOperations({ operation, args, query });
  return query;
}

beforeEach(() => vi.clearAllMocks());

describe('RLS · OWNER scope (inject ownerId)', () => {
  beforeEach(() => h.getServerSession.mockResolvedValue({ user: { id: 'owner_1', role: 'OWNER' } }));

  it('room.findMany → where.property.ownerId = ตัวเอง', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'room', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.property.ownerId).toBe('owner_1');
  });

  it('tenant.findMany → where.room.property.ownerId = ตัวเอง', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'tenant', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.room.property.ownerId).toBe('owner_1');
  });

  it('bill.update → ยัง scope ด้วย ownerId (กันแก้บิลหอคนอื่น)', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'bill', 'update', { where: { id: 'b1' }, data: {} });
    expect(q.mock.calls[0][0].where.room.property.ownerId).toBe('owner_1');
  });
});

describe('RLS · TENANT scope (inject roomId + block writes)', () => {
  beforeEach(() => {
    h.getServerSession.mockResolvedValue({ user: { id: 'tenant_user_1', role: 'TENANT' } });
    h.extendedClient.tenant.findUnique.mockResolvedValue({ roomId: 'room_1', room: { propertyId: 'prop_1' } });
  });

  it('bill.findMany → where.roomId = ห้องตัวเอง', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'bill', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.roomId).toBe('room_1');
  });

  it('SECURITY: bill.update (write) → โยน Forbidden', async () => {
    await getSecurePrisma();
    const query = vi.fn();
    await expect(
      h.rec.rls.query.bill.$allOperations({ operation: 'update', args: { where: {} }, query }),
    ).rejects.toThrow(/Forbidden/);
    expect(query).not.toHaveBeenCalled();
  });

  it('SECURITY: parcel.delete (write) → โยน Forbidden', async () => {
    await getSecurePrisma();
    const query = vi.fn();
    await expect(
      h.rec.rls.query.parcel.$allOperations({ operation: 'delete', args: { where: {} }, query }),
    ).rejects.toThrow(/Forbidden/);
  });

  it('SECURITY: maintenanceRequest.create ห้องคนอื่น → โยน Forbidden', async () => {
    await getSecurePrisma();
    const query = vi.fn();
    await expect(
      h.rec.rls.query.maintenanceRequest.$allOperations({
        operation: 'create',
        args: { data: { roomId: 'room_OTHER' } },
        query,
      }),
    ).rejects.toThrow(/Forbidden/);
  });

  it('maintenanceRequest.create ห้องตัวเอง → ผ่าน', async () => {
    await getSecurePrisma();
    const query = vi.fn().mockResolvedValue({});
    await h.rec.rls.query.maintenanceRequest.$allOperations({
      operation: 'create',
      args: { data: { roomId: 'room_1' } },
      query,
    });
    expect(query).toHaveBeenCalled();
  });
});

describe('RLS · invalid roomId profile → Forbidden', () => {
  it('TENANT ไม่มี room ผูกอยู่ → โยน Forbidden ตั้งแต่ต้น', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'tenant_x', role: 'TENANT' } });
    h.extendedClient.tenant.findUnique.mockResolvedValue({ roomId: null, room: null });
    await expect(getSecurePrisma()).rejects.toThrow(/Forbidden/);
  });
});

describe('RLS · STAFF scope (inject assignedPropertyIds — cross-property isolation)', () => {
  beforeEach(() => {
    h.getServerSession.mockResolvedValue({
      user: { id: 'staff_1', role: 'STAFF', assignedPropertyIds: ['prop_A'] },
    });
  });

  it('room.findMany → where.propertyId.in = เฉพาะตึกที่ได้รับมอบหมาย', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'room', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.propertyId.in).toEqual(['prop_A']);
  });

  it('SECURITY: room.findMany ไม่ถูกฝัง propertyId ของตึกอื่น (prop_B) เข้ามาได้เลย', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'room', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.propertyId.in).not.toContain('prop_B');
  });

  it('tenant.update → where.room.propertyId.in = เฉพาะตึกที่ได้รับมอบหมาย (กันแก้ผู้เช่าตึกอื่น)', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'tenant', 'update', { where: { id: 't1' }, data: {} });
    expect(q.mock.calls[0][0].where.room.propertyId.in).toEqual(['prop_A']);
  });

  it('bill.update → where.room.propertyId.in = เฉพาะตึกที่ได้รับมอบหมาย', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'bill', 'update', { where: { id: 'b1' }, data: {} });
    expect(q.mock.calls[0][0].where.room.propertyId.in).toEqual(['prop_A']);
  });

  it('maintenanceRequest.update → scope ด้วยตึกที่ได้รับมอบหมายเช่นกัน', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'maintenanceRequest', 'update', { where: { id: 'm1' }, data: {} });
    expect(q.mock.calls[0][0].where.room.propertyId.in).toEqual(['prop_A']);
  });

  it('parcel.findMany → scope ด้วยตึกที่ได้รับมอบหมายเช่นกัน', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'parcel', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.room.propertyId.in).toEqual(['prop_A']);
  });

  it('property.findMany → where.id.in = เฉพาะตึกที่ได้รับมอบหมาย (read-only scope)', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'property', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.id.in).toEqual(['prop_A']);
  });

  it('SECURITY: property.update (แก้ตั้งค่าตึก) → โยน Forbidden เสมอ (owner-only)', async () => {
    await getSecurePrisma();
    const query = vi.fn();
    await expect(
      h.rec.rls.query.property.$allOperations({ operation: 'update', args: { where: {} }, query }),
    ).rejects.toThrow(/Forbidden/);
    expect(query).not.toHaveBeenCalled();
  });

  it('SECURITY: property.delete → โยน Forbidden เสมอ (owner-only)', async () => {
    await getSecurePrisma();
    const query = vi.fn();
    await expect(
      h.rec.rls.query.property.$allOperations({ operation: 'delete', args: { where: {} }, query }),
    ).rejects.toThrow(/Forbidden/);
  });
});

describe('RLS · STAFF ที่ไม่มีตึกมอบหมายเลย (assignedPropertyIds ว่าง → deny-all)', () => {
  beforeEach(() => {
    h.getServerSession.mockResolvedValue({
      user: { id: 'staff_orphan', role: 'STAFF', assignedPropertyIds: [] },
    });
  });

  it('SECURITY: room.findMany → where.propertyId.in = [] (ไม่เห็นห้องไหนเลย ไม่ fallback เป็นเห็นหมด)', async () => {
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'room', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.propertyId.in).toEqual([]);
  });

  it('SECURITY: assignedPropertyIds undefined (ยังไม่ sync) → ยัง deny-all ไม่ throw ไม่ fallback', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'staff_new', role: 'STAFF' } });
    await getSecurePrisma();
    const q = await runModelHook(h.rec.rls, 'tenant', 'findMany', { where: {} });
    expect(q.mock.calls[0][0].where.room.propertyId.in).toEqual([]);
  });
});

describe('Soft-delete layer ($allModels)', () => {
  it('findMany บนโมเดล soft-delete (Bill) → inject where.isDeleted = false', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await h.rec.softDelete.query.$allModels.$allOperations({
      model: 'Bill', operation: 'findMany', args: { where: {} }, query,
    });
    expect(query.mock.calls[0][0].where.isDeleted).toBe(false);
  });

  it('โมเดลที่ไม่ soft-delete (User) → ไม่ยุ่ง where', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await h.rec.softDelete.query.$allModels.$allOperations({
      model: 'User', operation: 'findMany', args: { where: { email: 'a@b.com' } }, query,
    });
    expect(query.mock.calls[0][0].where).toEqual({ email: 'a@b.com' });
    expect(query.mock.calls[0][0].where.isDeleted).toBeUndefined();
  });
});
