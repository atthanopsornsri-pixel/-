/**
 * tests/api/tenants-id.test.ts
 * GET   /api/tenants/[id] — ดึงข้อมูลผู้เช่า (OWNER เท่านั้น)
 * PATCH /api/tenants/[id] — แก้ไขข้อมูลผู้เช่า (OWNER เท่านั้น)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/tenants/[id]/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: { update: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const ownerSession = { user: { id: "owner-1", role: "OWNER" } };
const params = Promise.resolve({ id: "tenant-1" });

const mockTenant = {
  id: "tenant-1",
  userId: "user-t-1",
  firstName: "สมชาย",
  lastName: "ใจดี",
  idCardNumber: "1234567890123",
  leaseStart: new Date("2025-01-01"),
  depositAmount: 5000,
  phoneNumber: "0812345678",
  room: {
    number: "101",
    rentPrice: 5000,
    property: {
      name: "JadHor Test",
      address: "กรุงเทพ",
      leaseTemplate: null,
      ownerId: "owner-1",
    },
  },
  user: { name: "สมชาย ใจดี", email: "somchai@example.com" },
};

// ─── GET ──────────────────────────────────────────────────────────────────────
describe("GET /api/tenants/[id] — ดึงข้อมูลผู้เช่า", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq() {
    return new Request("http://localhost/api/tenants/tenant-1");
  }

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("role TENANT → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("ไม่พบผู้เช่า → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("ผู้เช่าไม่อยู่ในหอของ owner → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "other-owner", role: "OWNER" } } as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("ดึงข้อมูลผู้เช่าสำเร็จ → 200 พร้อมข้อมูล", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("tenant-1");
    expect(data.firstName).toBe("สมชาย");
  });
});

// ─── PATCH ────────────────────────────────────────────────────────────────────
describe("PATCH /api/tenants/[id] — แก้ไขข้อมูลผู้เช่า", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.update).mockResolvedValue({
      ...mockTenant,
      firstName: "สมหญิง",
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
  });

  function makeReq(body: object) {
    return new Request("http://localhost/api/tenants/tenant-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await PATCH(makeReq({ firstName: "สมหญิง" }), { params });
    expect(res.status).toBe(401);
  });

  it("role TENANT → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const res = await PATCH(makeReq({ firstName: "สมหญิง" }), { params });
    expect(res.status).toBe(401);
  });

  it("ไม่พบผู้เช่า → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeReq({ firstName: "สมหญิง" }), { params });
    expect(res.status).toBe(403);
  });

  it("ผู้เช่าไม่อยู่ในหอของ owner → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "other-owner", role: "OWNER" } } as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    const res = await PATCH(makeReq({ firstName: "สมหญิง" }), { params });
    expect(res.status).toBe(403);
  });

  it("แก้ชื่อสำเร็จ → 200 + อัปเดต user.name ด้วย", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    const res = await PATCH(makeReq({ firstName: "สมหญิง", lastName: "ใจดี" }), { params });
    expect(res.status).toBe(200);
    // ตรวจว่ามีการ update user.name ด้วย
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-t-1" },
        data: { name: "สมหญิง ใจดี" },
      })
    );
  });

  it("แก้เฉพาะ depositAmount โดยไม่ส่ง firstName/lastName → ไม่ update user.name", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    await PATCH(makeReq({ depositAmount: 6000 }), { params });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("idCardNumber ถูก strip dashes/spaces → 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    vi.mocked(prisma.tenant.update).mockImplementation((async ({ data }: any) => data) as any);
    await PATCH(makeReq({ idCardNumber: "1-2345-67890-12-3" }), { params });
    const updateCall = vi.mocked(prisma.tenant.update).mock.calls[0][0];
    expect(updateCall.data.idCardNumber).toBe("1234567890123");
  });

  it("idCardNumber เป็น null → set null ได้", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);
    vi.mocked(prisma.tenant.update).mockImplementation((async ({ data }: any) => data) as any);
    await PATCH(makeReq({ idCardNumber: null }), { params });
    const updateCall = vi.mocked(prisma.tenant.update).mock.calls[0][0];
    expect(updateCall.data.idCardNumber).toBeNull();
  });
});
