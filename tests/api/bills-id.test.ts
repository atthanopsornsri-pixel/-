/**
 * tests/api/bills-id.test.ts
 * PATCH /api/bills/[id] — แก้ไขบิล
 * DELETE /api/bills/[id] — ลบบิล (soft delete)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/bills/[id]/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";

const ownerSession = { user: { id: "owner-1", role: "OWNER" } };

function makeReq(body: object) {
  return new Request("http://localhost/api/bills/bill-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "bill-1" });

const mockBillUnpaid = {
  id: "bill-1",
  type: "MONTHLY",
  status: "UNPAID",
  isDeleted: false,
  rentAmount: 5000,
  waterUnits: 10,
  waterAmount: 200,
  electricUnits: 50,
  electricAmount: 400,
  commonFee: 0,
  parkingFee: 0,
  internetFee: 0,
  otherFee: 0,
  securityDeposit: 0,
  advanceRent: 0,
  keyDeposit: 0,
  vehicleFee: 0,
  room: {
    property: {
      ownerId: "owner-1",
      waterRate: 20,
      electricRate: 8,
    },
  },
};

function setupSecureDb(bill = mockBillUnpaid) {
  const db = { bill: { findUnique: vi.fn().mockResolvedValue(bill) } };
  vi.mocked(getSecurePrisma).mockResolvedValue(db as any);
  return db;
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
describe("PATCH /api/bills/[id] — แก้ไขบิล", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.bill.update).mockResolvedValue({ ...mockBillUnpaid, rentAmount: 5500 } as any);
  });

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(401);
  });

  it("role TENANT → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(401);
  });

  it("บิลไม่พบ (secureDb คืน null) → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb(null as any);
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(403);
  });

  it("บิล ownerId ไม่ตรง session → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "other-owner", role: "OWNER" } } as any);
    setupSecureDb();
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(403);
  });

  it("บิลถูก soft-delete → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb({ ...mockBillUnpaid, isDeleted: true });
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/ถูกลบ/);
  });

  it("บิล PAID ห้ามแก้ → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb({ ...mockBillUnpaid, status: "PAID" });
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/ชำระแล้ว/);
  });

  it("ค่าเงินติดลบ → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb();
    const res = await PATCH(makeReq({ rentAmount: -1 }), { params });
    expect(res.status).toBe(400);
  });

  it("แก้ไขบิลสำเร็จ → 200 พร้อมข้อมูลบิลใหม่", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb();
    const res = await PATCH(makeReq({ rentAmount: 5500 }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rentAmount).toBe(5500);
  });

  it("คำนวณ water/electric ใหม่จาก units×rate เมื่อมี rate", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb();
    vi.mocked(prisma.bill.update).mockImplementation((async ({ data }: any) => data) as any);
    await PATCH(makeReq({ waterUnits: 15, electricUnits: 100 }), { params });
    const updateCall = vi.mocked(prisma.bill.update).mock.calls[0][0];
    // water = 15 × 20 = 300, electric = 100 × 8 = 800
    expect(updateCall.data.waterAmount).toBe(300);
    expect(updateCall.data.electricAmount).toBe(800);
  });

  it("บิล CHECKIN: แก้ securityDeposit + advanceRent สำเร็จ → 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb({ ...mockBillUnpaid, type: "CHECKIN", securityDeposit: 5000, advanceRent: 5000 });
    vi.mocked(prisma.bill.update).mockResolvedValue({ id: "bill-1", totalAmount: 12000 } as any);
    const res = await PATCH(makeReq({ securityDeposit: 6000, advanceRent: 6000 }), { params });
    expect(res.status).toBe(200);
  });

  it("บิล CHECKIN: ยอดรวม 0 → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb({ ...mockBillUnpaid, type: "CHECKIN", securityDeposit: 0, advanceRent: 0, keyDeposit: 0, vehicleFee: 0 });
    const res = await PATCH(makeReq({ securityDeposit: 0, advanceRent: 0, keyDeposit: 0, vehicleFee: 0 }), { params });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
describe("DELETE /api/bills/[id] — ลบบิล (soft delete)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.bill.update).mockResolvedValue({ id: "bill-1", isDeleted: true } as any);
  });

  function makeDeleteReq() {
    return new Request("http://localhost/api/bills/bill-1", { method: "DELETE" });
  }

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(), { params });
    expect(res.status).toBe(401);
  });

  it("บิลไม่พบ → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb(null as any);
    const res = await DELETE(makeDeleteReq(), { params });
    expect(res.status).toBe(403);
  });

  it("บิล PAID → ลบไม่ได้ → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb({ ...mockBillUnpaid, status: "PAID" });
    const res = await DELETE(makeDeleteReq(), { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/ชำระแล้ว/);
  });

  it("ลบบิลสำเร็จ → 200 { success: true }", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb();
    const res = await DELETE(makeDeleteReq(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
