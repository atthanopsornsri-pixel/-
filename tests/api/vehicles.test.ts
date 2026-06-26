import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  roomFindMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  vehicleCreate: vi.fn(),
  vehicleFindFirst: vi.fn(),
  vehicleDelete: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findMany: mocks.roomFindMany },
    tenant: { findUnique: mocks.tenantFindUnique },
    vehicle: { create: mocks.vehicleCreate, findFirst: mocks.vehicleFindFirst, delete: mocks.vehicleDelete },
  },
}));

import { GET as ownerGET } from '@/app/api/owner/vehicles/route';
import { GET as tenantGET, POST as tenantPOST } from '@/app/api/tenant/vehicles/route';
import { DELETE as tenantDELETE } from '@/app/api/tenant/vehicles/[id]/route';

const ownerSession = { user: { id: 'owner_1', role: 'OWNER' } };
const tenantSession = { user: { id: 'tuser_1', role: 'TENANT' } };

const postReq = (body: unknown) =>
  new Request('http://localhost/api/tenant/vehicles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tenantFindUnique.mockResolvedValue({ id: 'tenant_1' });
  mocks.vehicleCreate.mockImplementation((async (a: any) => ({ id: 'v1', ...a.data })) as any);
});

describe('GET /api/owner/vehicles — isolation', () => {
  it('ไม่ใช่ OWNER → 401', async () => {
    mocks.getServerSession.mockResolvedValue(tenantSession);
    const res = await ownerGET(new Request('http://localhost/api/owner/vehicles'));
    expect(res.status).toBe(401);
  });

  it('SECURITY: query scope ด้วย ownerId แม้ส่ง propertyId มา', async () => {
    mocks.getServerSession.mockResolvedValue(ownerSession);
    mocks.roomFindMany.mockResolvedValue([]);
    await ownerGET(new Request('http://localhost/api/owner/vehicles?propertyId=prop_X'));
    const where = mocks.roomFindMany.mock.calls[0][0].where;
    expect(where.property).toEqual({ id: 'prop_X', ownerId: 'owner_1' });
    // #4: ไม่กรอง status แล้ว (ห้อง MAINTENANCE ที่ยังมีผู้เช่าต้องเห็นรถด้วย)
    expect(where.status).toBeUndefined();
  });

  it('flatten vehicles + แนบ room/property', async () => {
    mocks.getServerSession.mockResolvedValue(ownerSession);
    mocks.roomFindMany.mockResolvedValue([
      { number: '101', property: { name: 'หอ A' }, tenants: [{ firstName: 'สมชาย', user: { name: 'สมชาย ใจดี' }, vehicles: [{ id: 'v1', licensePlate: 'กก1234' }] }] },
    ]);
    const res = await ownerGET(new Request('http://localhost/api/owner/vehicles'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      expect.objectContaining({ id: 'v1', tenantName: 'สมชาย ใจดี', roomNumber: '101', propertyName: 'หอ A' }),
    ]);
  });

  it('DB error → 500 (ไม่ throw หลุด)', async () => {
    mocks.getServerSession.mockResolvedValue(ownerSession);
    mocks.roomFindMany.mockRejectedValue(new Error('db down'));
    const res = await ownerGET(new Request('http://localhost/api/owner/vehicles'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/tenant/vehicles — validation', () => {
  beforeEach(() => mocks.getServerSession.mockResolvedValue(tenantSession));

  it('ไม่ใช่ TENANT → 401', async () => {
    mocks.getServerSession.mockResolvedValue(ownerSession);
    const res = await tenantPOST(postReq({ licensePlate: 'กก1234' }));
    expect(res.status).toBe(401);
  });

  it('ไม่มีทะเบียน → 400', async () => {
    const res = await tenantPOST(postReq({ licensePlate: '  ' }));
    expect(res.status).toBe(400);
    expect(mocks.vehicleCreate).not.toHaveBeenCalled();
  });

  it('type มั่ว → fallback MOTORCYCLE (ไม่ 500)', async () => {
    const res = await tenantPOST(postReq({ licensePlate: 'กก1234', type: 'TRUCK' }));
    expect(res.status).toBe(201);
    expect(mocks.vehicleCreate.mock.calls[0][0].data.type).toBe('MOTORCYCLE');
  });

  it('สร้างสำเร็จ → 201, ทะเบียน uppercase + ผูก tenantId ตัวเอง', async () => {
    const res = await tenantPOST(postReq({ licensePlate: ' bc1234 ', type: 'CAR' }));
    expect(res.status).toBe(201);
    const data = mocks.vehicleCreate.mock.calls[0][0].data;
    expect(data.licensePlate).toBe('BC1234');
    expect(data.tenantId).toBe('tenant_1');
    expect(data.type).toBe('CAR');
  });

  it('create ล้ม → 500 (มี try/catch)', async () => {
    mocks.vehicleCreate.mockRejectedValue(new Error('db down'));
    const res = await tenantPOST(postReq({ licensePlate: 'กก1234' }));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/tenant/vehicles', () => {
  it('คืนรถของตัวเอง', async () => {
    mocks.getServerSession.mockResolvedValue(tenantSession);
    mocks.tenantFindUnique.mockResolvedValue({ id: 'tenant_1', vehicles: [{ id: 'v1' }] });
    const res = await tenantGET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'v1' }]);
  });
});

describe('DELETE /api/tenant/vehicles/[id] — anti-spoof (SECURITY)', () => {
  const ctx = { params: Promise.resolve({ id: 'v_target' }) };

  beforeEach(() => mocks.getServerSession.mockResolvedValue(tenantSession));

  it('ลบรถที่ไม่ใช่ของตัวเอง (findFirst ไม่เจอ) → 404 ไม่ลบ', async () => {
    mocks.vehicleFindFirst.mockResolvedValue(null);
    const res = await tenantDELETE(new Request('http://localhost', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(404);
    expect(mocks.vehicleDelete).not.toHaveBeenCalled();
    // ตรวจว่าเช็คความเป็นเจ้าของด้วย tenantId ตัวเอง
    expect(mocks.vehicleFindFirst.mock.calls[0][0].where).toMatchObject({ id: 'v_target', tenantId: 'tenant_1' });
  });

  it('ลบรถของตัวเอง → 200', async () => {
    mocks.vehicleFindFirst.mockResolvedValue({ id: 'v_target', tenantId: 'tenant_1' });
    mocks.vehicleDelete.mockResolvedValue({});
    const res = await tenantDELETE(new Request('http://localhost', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(200);
    expect(mocks.vehicleDelete).toHaveBeenCalledWith({ where: { id: 'v_target' } });
  });
});
