/**
 * tests/api/bills-crud.test.ts
 * POST /api/bills — สร้างบิล
 * GET  /api/bills — ดึงรายการบิล
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/bills/route";
import { NextResponse } from "next/server";

// ─── mocks ───────────────────────────────────────────────────────────────────
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    tenant: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn(),
}));
vi.mock("@/lib/line", () => ({ sendLineOAMessage: vi.fn() }));
vi.mock("@/lib/sms", () => ({ sendSmsWithAddon: vi.fn() }));
vi.mock("@/lib/ai", () => ({
  detectBillAnomaly: vi.fn(),
  draftBillNotification: vi.fn(),
}));
// mock next/server after() เป็น no-op
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn((fn) => fn()) };
});

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";

// ─── helper ──────────────────────────────────────────────────────────────────
const ownerSession = { user: { id: "owner-1", role: "OWNER" } };
const adminSession = { user: { id: "admin-1", role: "ADMIN" } };

function makeReq(body: object, url = "http://localhost/api/bills") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const baseBody = {
  roomId: "room-1",
  month: 6,
  year: 2025,
  rentAmount: 5000,
  waterAmount: 200,
  electricAmount: 300,
  waterUnits: null,
  electricUnits: null,
  commonFee: 0,
  parkingFee: 0,
  internetFee: 0,
  otherFee: 0,
  dueDate: "2025-06-10",
};

const mockRoom = {
  id: "room-1",
  number: "101",
  property: {
    ownerId: "owner-1",
    name: "JadHor Test",
    waterRate: null,
    electricRate: null,
    owner: {
      lineUserId: null,
      lineChannelAccessToken: null,
    },
  },
};

const mockBill = {
  id: "bill-1",
  month: 6,
  year: 2025,
  roomId: "room-1",
  totalAmount: 5500,
  status: "UNPAID",
  room: { number: "101" },
};

function setupSecureDb(overrides = {}) {
  const db = {
    room: { findUnique: vi.fn().mockResolvedValue(mockRoom) },
    bill: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    tenant: { findFirst: vi.fn().mockResolvedValue(null) },
    ...overrides,
  };
  vi.mocked(getSecurePrisma).mockResolvedValue(db as any);
  return db;
}

// ─── POST /api/bills ──────────────────────────────────────────────────────────
describe("POST /api/bills — สร้างบิล", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.bill.create).mockResolvedValue(mockBill as any);
  });

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeReq(baseBody));
    expect(res.status).toBe(401);
  });

  it("role ไม่ใช่ OWNER (TENANT) → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const res = await POST(makeReq(baseBody));
    expect(res.status).toBe(401);
  });

  it("ขาด required field (dueDate) → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const { dueDate, ...noDate } = baseBody;
    const res = await POST(makeReq(noDate));
    expect(res.status).toBe(400);
  });

  it("ค่าเงินติดลบ → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const res = await POST(makeReq({ ...baseBody, rentAmount: -1 }));
    expect(res.status).toBe(400);
  });

  it("room ไม่พบ (secureDb คืน null) → 403", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const db = setupSecureDb();
    db.room.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq(baseBody));
    expect(res.status).toBe(403);
  });

  it("บิลของเดือนนี้มีอยู่แล้ว → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const db = setupSecureDb();
    db.bill.findFirst.mockResolvedValue({ id: "old-bill" });
    const res = await POST(makeReq(baseBody));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/ถูกสร้างไปแล้ว/);
  });

  it("สร้างบิลสำเร็จ → 201 พร้อมข้อมูลบิล", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb();
    const res = await POST(makeReq(baseBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("bill-1");
  });

  it("คำนวณยอดน้ำ/ไฟใหม่จาก units×rate บน server (ไม่รับค่าจาก client)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const db = setupSecureDb();
    // ห้องนี้มี rate
    db.room.findUnique.mockResolvedValue({
      ...mockRoom,
      property: { ...mockRoom.property, waterRate: 20, electricRate: 8 },
    });
    // client ส่ง amount ผิด แต่มี units ถูก
    await POST(makeReq({ ...baseBody, waterUnits: 10, electricUnits: 50, waterAmount: 9999, electricAmount: 9999 }));
    const createCall = vi.mocked(prisma.bill.create).mock.calls[0][0];
    // server ต้องคำนวณเอง: water = 10×20 = 200, electric = 50×8 = 400
    expect(createCall.data.waterAmount).toBe(200);
    expect(createCall.data.electricAmount).toBe(400);
  });

  it("Prisma P2002 (duplicate) → 400", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    setupSecureDb();
    // สร้าง PrismaClientKnownRequestError จริงด้วย constructor ที่ถูกต้อง
    const { Prisma } = await import("@prisma/client");
    const p2002 = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "6.0.0",
    });
    vi.mocked(prisma.bill.create).mockRejectedValue(p2002);
    const res = await POST(makeReq(baseBody));
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/bills ───────────────────────────────────────────────────────────
describe("GET /api/bills — ดึงรายการบิล", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ไม่มี session → 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/bills"));
    expect(res.status).toBe(401);
  });

  it("OWNER ดึงบิลได้ → 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession as any);
    const db = setupSecureDb();
    db.bill.findMany.mockResolvedValue([mockBill]);
    const res = await GET(new Request("http://localhost/api/bills"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("TENANT ดึงบิลตัวเองได้ → 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "t-1", role: "TENANT" } } as any);
    const db = setupSecureDb();
    db.bill.findMany.mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/bills"));
    expect(res.status).toBe(200);
  });
});
