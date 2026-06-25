import { describe, it, expect, beforeEach, vi } from 'vitest';

// state ต้องห่อ vi.hoisted เพราะ vi.mock ถูก hoist ขึ้นบนสุด
const h = vi.hoisted(() => {
  const extended: any = { __secure: true };
  extended.$extends = vi.fn(() => extended); // รองรับ chain ($extends ซ้อน)
  return { extended, getServerSession: vi.fn() };
});

vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  // prisma-secure เรียก prisma.$extends ตอน module load — ต้องมี
  prisma: { $extends: vi.fn(() => h.extended) },
}));

import { getSecurePrisma } from '@/lib/prisma-secure';

beforeEach(() => vi.clearAllMocks());

describe('getSecurePrisma — security gate', () => {
  it('SECURITY: ไม่มี session → โยน Unauthorized (ปฏิเสธการเข้าถึง)', async () => {
    h.getServerSession.mockResolvedValue(null);
    await expect(getSecurePrisma()).rejects.toThrow(/Unauthorized/);
  });

  it('SECURITY: role ที่ไม่รู้จัก → โยน Forbidden (ไม่ปล่อยผ่าน)', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'x', role: 'HACKER' } });
    await expect(getSecurePrisma()).rejects.toThrow(/Forbidden/);
  });

  it('ADMIN → คืน secure client (ผ่าน soft-delete extension) ไม่ใช่ prisma ดิบ', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'admin_1', role: 'ADMIN' } });
    const client = await getSecurePrisma();
    expect(client).toBe(h.extended);
  });

  it('OWNER → คืน client ที่ scope ด้วย ownerId (มีการ $extends เพิ่มชั้น)', async () => {
    h.getServerSession.mockResolvedValue({ user: { id: 'owner_1', role: 'OWNER' } });
    const client = await getSecurePrisma();
    expect(client).toBeTruthy();
    // OWNER ต้องห่อ policy เพิ่มอีกชั้นบน soft-delete client
    expect(h.extended.$extends).toHaveBeenCalled();
  });
});
