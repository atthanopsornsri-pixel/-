/**
 * tests/api/bills-approve-notify.test.ts
 * PATCH /api/bills/[id]/approve — เจ้าของอนุมัติสลิป → PAID
 * POST  /api/bills/[id]/notify  — ส่ง LINE แจ้งเตือนผู้เช่า
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH as APPROVE } from "@/app/api/bills/[id]/approve/route";
import { POST as NOTIFY } from "@/app/api/bills/[id]/notify/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/line", () => ({ sendLineOAMessage: vi.fn() }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn((fn) => fn()) };
});

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

const ownerSession = { user: { id: "owner-1", role: "OWNER" } };
const params = Promise.resolve({ id: "bill-1" });

const mockBillPending = {
  id: "bill-1",
  month: 6,
  year: 2025,
  type: "MONTHLY",
  status: "PENDING",
  totalAmount: 5500,
  paidAmount: 0,
  paymentDate: null,
  room: {
    number: "101",
    property: {
      ownerId: "owner-1",
      name: "JadHor Test",
      owner: { lineChannelAccessToken: "TOKEN-123" },
    },
    tenants: [
      { lineUserId: "tenant-line-id", firstName: "สมชาย", lastName: "ใจดี" },
    ],
  },
};

// ─── PATCH /approve ────────────────────────────────────────────────────────────
describe("PATCH /api/bills/[id]/approve — อนุมัติสลิป", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.bill.updateMany).mockResolvedValue({ count: 1 } as any);
  });

  function makeReq() {
    return new Request("http://localhost/api/bills/bill-1/approve", { method: "PATCH" });
  }

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await APPROVE(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("role ไม่ใช่ OWNER → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const res = await APPROVE(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("ไม่พบบิล → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue(null);
    const res = await APPROVE(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("บิล ownerId ไม่ตรง → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "other", role: "OWNER" } } as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue(mockBillPending as any);
    const res = await APPROVE(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("อนุมัติสำเร็จ → 200 + status PAID", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique)
      .mockResolvedValueOnce(mockBillPending as any)
      .mockResolvedValueOnce({ ...mockBillPending, status: "PAID", paidAmount: 5500 } as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true } as any);
    const res = await APPROVE(makeReq(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("PAID");
  });

  it("อนุมัติ → ส่ง LINE แจ้งผู้เช่า (fire-and-forget)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique)
      .mockResolvedValueOnce(mockBillPending as any)
      .mockResolvedValueOnce({ ...mockBillPending, status: "PAID", paidAmount: 5500 } as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true } as any);
    await APPROVE(makeReq(), { params });
    expect(sendLineOAMessage).toHaveBeenCalledWith(
      "tenant-line-id",
      expect.stringContaining("ยืนยันการชำระเงิน"),
      "TOKEN-123"
    );
  });

  it("ผู้เช่าไม่มี lineUserId → ไม่ส่ง LINE แต่ยัง 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const tenantlessBill = {
      ...mockBillPending,
      room: { ...mockBillPending.room, tenants: [{ lineUserId: null, firstName: "สมชาย", lastName: "" }] },
    };
    vi.mocked(prisma.bill.findUnique)
      .mockResolvedValueOnce(tenantlessBill as any)
      .mockResolvedValueOnce({ ...tenantlessBill, status: "PAID", paidAmount: 5500 } as any);
    const res = await APPROVE(makeReq(), { params });
    expect(res.status).toBe(200);
    expect(sendLineOAMessage).not.toHaveBeenCalled();
  });
});

// ─── POST /notify ─────────────────────────────────────────────────────────────
describe("POST /api/bills/[id]/notify — ส่ง LINE แจ้งเตือน", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq() {
    return new Request("http://localhost/api/bills/bill-1/notify", { method: "POST" });
  }

  const mockBillForNotify = {
    ...mockBillPending,
    rentAmount: 5000,
    waterAmount: 200,
    waterUnits: 10,
    electricAmount: 300,
    electricUnits: 15,
    commonFee: 0,
    parkingFee: 0,
    internetFee: 0,
    otherFee: 0,
    dueDate: new Date("2025-06-10"),
    paymentDate: null,
    room: {
      number: "101",
      property: {
        ownerId: "owner-1",
        name: "JadHor Test",
        owner: { lineChannelAccessToken: "TOKEN-123" },
      },
      tenants: [
        { lineUserId: "tenant-line-id", firstName: "สมชาย", lastName: "ใจดี", phoneNumber: "0812345678" },
      ],
    },
  };

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("role ไม่ใช่ OWNER → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("ไม่พบบิล → 404", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue(null);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(404);
  });

  it("บิล ownerId ไม่ตรง → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "other", role: "OWNER" } } as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue(mockBillForNotify as any);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("หอยังไม่ตั้ง LINE Token → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue({
      ...mockBillForNotify,
      room: {
        ...mockBillForNotify.room,
        property: { ...mockBillForNotify.room.property, owner: { lineChannelAccessToken: null } },
      },
    } as any);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/LINE OA Token/);
  });

  it("ผู้เช่าไม่ผูก LINE → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue({
      ...mockBillForNotify,
      room: {
        ...mockBillForNotify.room,
        tenants: [{ lineUserId: null, firstName: "สมชาย", lastName: "", phoneNumber: "081" }],
      },
    } as any);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/LINE/);
  });

  it("ส่ง LINE สำเร็จ → 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue(mockBillForNotify as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true } as any);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("LINE API ล้มเหลว → 502 พร้อม error message", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue(mockBillForNotify as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: false, error: "Invalid token" } as any);
    const res = await NOTIFY(makeReq(), { params });
    expect(res.status).toBe(502);
  });

  it("บิล PAID → ข้อความเป็นใบเสร็จ (ไม่ใช่ใบแจ้งหนี้)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    vi.mocked(prisma.bill.findUnique).mockResolvedValue({
      ...mockBillForNotify,
      status: "PAID",
      paymentDate: new Date("2025-06-05"),
    } as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true } as any);
    await NOTIFY(makeReq(), { params });
    const msg = vi.mocked(sendLineOAMessage).mock.calls[0][1];
    expect(msg).toMatch(/ได้รับชำระเงิน/);
    expect(msg).not.toMatch(/กำหนดชำระ/);
  });

  it("บิล UNPAID ที่เกินกำหนด → ข้อความเตือนด่วน พร้อมคำว่า เกินกำหนดมาแล้ว และรายละเอียดค่าใช้จ่าย", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    // วันครบกำหนดในอดีต (เกินกำหนด)
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 3);

    vi.mocked(prisma.bill.findUnique).mockResolvedValue({
      ...mockBillForNotify,
      status: "UNPAID",
      dueDate: pastDueDate,
    } as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true } as any);
    await NOTIFY(makeReq(), { params });
    const msg = vi.mocked(sendLineOAMessage).mock.calls[0][1];
    expect(msg).toMatch(/แจ้งเตือนด่วน: บิลค้างชำระ!/);
    expect(msg).toMatch(/เกินกำหนดมาแล้ว/);
    expect(msg).toMatch(/ค่าเช่าห้อง: ฿5,000/);
    expect(msg).toMatch(/ค่าน้ำ \(10 หน่วย\): ฿200/);
    expect(msg).toMatch(/ค่าไฟ \(15 หน่วย\): ฿300/);
  });

  it("บิล UNPAID ที่ยังไม่เกินกำหนด → ข้อความเป็นใบแจ้งหนี้ปกติ", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    // วันครบกำหนดในอนาคต (ยังไม่เกินกำหนด)
    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 5);

    vi.mocked(prisma.bill.findUnique).mockResolvedValue({
      ...mockBillForNotify,
      status: "UNPAID",
      dueDate: futureDueDate,
    } as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true } as any);
    await NOTIFY(makeReq(), { params });
    const msg = vi.mocked(sendLineOAMessage).mock.calls[0][1];
    expect(msg).toMatch(/ใบแจ้งหนี้ค่าเช่า/);
    expect(msg).not.toMatch(/แจ้งเตือนด่วน: บิลค้างชำระ!/);
    expect(msg).toMatch(/ค่าเช่าห้อง: ฿5,000/);
  });
});
