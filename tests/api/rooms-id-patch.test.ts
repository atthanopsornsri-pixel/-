import { describe, it, expect, beforeEach, vi } from 'vitest';

// ปิด gap ของ completeness.test.ts ที่ test rooms PATCH แค่ happy path
// — เพิ่ม negative case (IDOR: ห้องของ owner คนอื่น) + auth gate
const h = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  roomFindUnique: vi.fn(),
  roomUpdate: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { room: { findUnique: h.roomFindUnique, update: h.roomUpdate } },
}));

import { PATCH } from '@/app/api/rooms/[id]/route';

const ctx = { params: Promise.resolve({ id: 'room-abc' }) };
const body = { number: '101', rentPrice: 4500, imageMain: 'm.jpg' };
const makeReq = () =>
  new Request('http://localhost/api/rooms/room-abc', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  h.roomUpdate.mockResolvedValue({ id: 'room-abc' });
});

describe('PATCH /api/rooms/[id] — auth & IDOR', () => {
  it('role ไม่ใช่ OWNER → 401', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 't1', role: 'TENANT' } });
    const res = await PATCH(makeReq(), ctx);
    expect(res.status).toBe(401);
    expect(h.roomUpdate).not.toHaveBeenCalled();
  });

  it('SECURITY (IDOR): ห้องเป็นของ owner คนอื่น → 403 ไม่ update', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'owner-A', role: 'OWNER' } });
    h.roomFindUnique.mockResolvedValue({ id: 'room-abc', property: { ownerId: 'owner-B' } });
    const res = await PATCH(makeReq(), ctx);
    expect(res.status).toBe(403);
    expect(h.roomUpdate).not.toHaveBeenCalled();
  });

  it('ไม่พบห้อง → 403', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'owner-A', role: 'OWNER' } });
    h.roomFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeReq(), ctx);
    expect(res.status).toBe(403);
  });

  it('owner เจ้าของห้อง → 200 + บันทึกได้', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'owner-A', role: 'OWNER' } });
    h.roomFindUnique.mockResolvedValue({ id: 'room-abc', property: { ownerId: 'owner-A' } });
    const res = await PATCH(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(h.roomUpdate).toHaveBeenCalled();
  });
});
