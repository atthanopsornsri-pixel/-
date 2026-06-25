/**
 * tests/api/bills-bulk.test.ts
 * POST /api/bills/bulk — ออกบิลรายเดือนพร้อมกันทุกห้องที่มีผู้เช่าอยู่
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/bills/bulk/route";
import { NextResponse } from "next/server";

// ─── mocks ───────────────────────────────────────────────────────────────────
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn(),
}));
vi.mock("@/lib/line", () => ({ sendLineOAMessage: vi.fn() }));
vi.mock("@/lib/sms", () => ({ sendSmsWithAddon: vi.fn() }));
// mock next/server after() เป็น no-op
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn((fn) => fn()) };
});

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";

const ownerSession = { user: { id: "owner-1", role: "OWNER" } };
const tenantSession = { user: { id: "tenant-1", role: "TENANT" } };

function makeReq(body: object) {
  return new Request("http://localhost/api/bills/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bills/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("สิทธิ์ไม่ใช่ OWNER → 401 Unauthorized", async () => {
    vi.mocked(getServerSession).mockResolvedValue(tenantSession);
    const req = makeReq({ propertyId: "prop-1", month: 6, year: 2025, dueDate: "2025-06-10" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toBe("Unauthorized");
  });

  it("ข้อมูลไม่ครบถ้วน → 400 Bad Request", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession);
    const req = makeReq({ propertyId: "", month: 6, year: 2025, dueDate: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("กรุณาระบุ");
  });

  it("หอพักไม่เป็นของ OWNER → 403 Forbidden", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession);
    
    const mockProperty = { id: "prop-2", ownerId: "owner-other" };
    const db = {
      property: { findUnique: vi.fn().mockResolvedValue(mockProperty) },
    };
    vi.mocked(getSecurePrisma).mockResolvedValue(db as any);

    const req = makeReq({ propertyId: "prop-2", month: 6, year: 2025, dueDate: "2025-06-10" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toBe("ไม่พบหอพักหรือไม่มีสิทธิ์");
  });

  it("ไม่มีห้องที่มีผู้เช่า → 200 พร้อมข้อความแจ้ง", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession);

    const mockProperty = { id: "prop-1", ownerId: "owner-1", defaultCommonFee: 100 };
    const db = {
      property: { findUnique: vi.fn().mockResolvedValue(mockProperty) },
      room: { findMany: vi.fn().mockResolvedValue([]) },
    };
    vi.mocked(getSecurePrisma).mockResolvedValue(db as any);

    const req = makeReq({ propertyId: "prop-1", month: 6, year: 2025, dueDate: "2025-06-10" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("ไม่พบห้องที่มีผู้เช่าอยู่ในหอนี้");
    expect(data.created).toBe(0);
  });

  it("มีห้องที่มีผู้เช่าและสร้างบิลสำเร็จ โดยข้ามห้องที่สร้างแล้วเพื่อป้องกัน duplicate", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession);

    const mockProperty = {
      id: "prop-1",
      ownerId: "owner-1",
      defaultCommonFee: 100,
      defaultParkingFee: 0,
      defaultInternetFee: 0,
      owner: { lineChannelAccessToken: "token-123" }
    };
    const mockRooms = [
      {
        id: "room-101",
        number: "101",
        rentPrice: 3500,
        tenants: [
          {
            lineUserId: "line-u1",
            firstName: "สมชาย",
            lastName: "ใจดี",
            phoneNumber: "0812345678"
          }
        ]
      },
      {
        id: "room-102",
        number: "102",
        rentPrice: 4000,
        tenants: []
      }
    ];

    // room-101 มีบิลอยู่แล้วในเดือนนี้
    const mockExistingBills = [{ roomId: "room-101" }];

    const db = {
      property: { findUnique: vi.fn().mockResolvedValue(mockProperty) },
      room: { findMany: vi.fn().mockResolvedValue(mockRooms) },
      bill: { findMany: vi.fn().mockResolvedValue(mockExistingBills) },
    };
    vi.mocked(getSecurePrisma).mockResolvedValue(db as any);

    // mock การสร้างบิล
    const createdBill = {
      id: "bill-102",
      month: 6,
      year: 2025,
      roomId: "room-102",
      rentAmount: 4000,
      totalAmount: 4100,
      room: { number: "102" }
    };
    vi.mocked(prisma.bill.create).mockResolvedValue(createdBill as any);

    const req = makeReq({
      propertyId: "prop-1",
      month: 6,
      year: 2025,
      dueDate: "2025-06-10",
      commonFee: 100,
      parkingFee: 0,
      internetFee: 0
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.created).toBe(1);
    expect(data.skipped).toBe(1);
    expect(data.skippedRooms).toContain("101");
    expect(data.errors).toBe(0);
    
    // ตรวจสอบว่าเรียก prisma.bill.create สำหรับห้อง 102
    expect(prisma.bill.create).toHaveBeenCalledOnce();
  });
});
