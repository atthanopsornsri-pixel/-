/**
 * tests/api/cron-bill-reminder.test.ts
 * GET /api/cron/bill-reminder — ส่งแจ้งเตือนบิลค้างชำระอัตโนมัติ
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/cron/bill-reminder/route";
import { NextResponse } from "next/server";

// ─── mocks ───────────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/line", () => ({
  sendLineOAMessage: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/sms", () => ({
  sendSmsWithAddon: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/logger", () => ({
  logError: vi.fn((msg, err) => {
    console.error("TEST_LOG_ERROR:", msg, err);
  }),
}));

import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { sendSmsWithAddon } from "@/lib/sms";

function makeReq(authHeader?: string) {
  const headers = new Headers();
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return new Request("http://localhost/api/cron/bill-reminder", {
    method: "GET",
    headers,
  });
}

describe("GET /api/cron/bill-reminder", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("เช็ก Authorization (CRON_SECRET) → 401 Unauthorized หากไม่ตรง", async () => {
    process.env.CRON_SECRET = "super-secret-key";
    const req = makeReq("Bearer wrong-key");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("ทำงานสำเร็จแม้ไม่พบห้อง/บิลที่ต้องเตือน", async () => {
    process.env.CRON_SECRET = "super-secret-key";
    vi.mocked(prisma.bill.findMany).mockResolvedValue([]);

    const req = makeReq("Bearer super-secret-key");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
    expect(data.sent).toBe(0);
  });

  it("พบเตือนครบกำหนดชำระ (อีก 3 วัน) และสามารถแจ้งผ่าน LINE สำเร็จ", async () => {
    process.env.CRON_SECRET = "super-secret-key";
    
    // บิลจะครบกำหนดชำระอีก 3 วัน (normalize เที่ยงคืน — route วัด diffDays เทียบ todayStart=เที่ยงคืน)
    const due = new Date();
    due.setDate(due.getDate() + 3);
    due.setHours(0, 0, 0, 0);

    const mockUnpaidBill = {
      id: "bill-1",
      month: 6,
      year: 2025,
      totalAmount: 3500,
      paidAmount: 0,
      dueDate: due,
      status: "UNPAID",
      room: {
        number: "101",
        property: {
          owner: {
            id: "owner-1",
            lineChannelAccessToken: "line-token"
          }
        },
        tenants: [
          {
            lineUserId: "line-user-1",
            firstName: "สมคิด",
            lastName: "จิตมั่นคง",
            phoneNumber: "0898765432"
          }
        ]
      }
    };

    vi.mocked(prisma.bill.findMany).mockResolvedValue([mockUnpaidBill] as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true, messageId: "msg-1" } as any);

    const req = makeReq("Bearer super-secret-key");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(1);
    expect(data.sent).toBe(1);
    expect(data.failed).toBe(0);

    expect(sendLineOAMessage).toHaveBeenCalledWith(
      "line-user-1",
      expect.stringContaining("เหลืออีก 3 วัน"),
      "line-token"
    );
    expect(sendSmsWithAddon).toHaveBeenCalled();
  });

  it("พบเตือนเกินกำหนดชำระ (เลย 2 วัน) เปลี่ยนสถานะบิลเป็น OVERDUE และแจ้งเตือนสำเร็จ", async () => {
    process.env.CRON_SECRET = "super-secret-key";
    
    // บิลเลยกำหนดแล้ว 2 วัน (normalize เที่ยงคืน — กัน time-of-day ทำ diffDays ปัดเพี้ยน)
    const due = new Date();
    due.setDate(due.getDate() - 2);
    due.setHours(0, 0, 0, 0);

    const mockOverdueBill = {
      id: "bill-2",
      month: 6,
      year: 2025,
      totalAmount: 4000,
      paidAmount: 0,
      dueDate: due,
      status: "UNPAID",
      room: {
        number: "102",
        property: {
          owner: {
            id: "owner-2",
            lineChannelAccessToken: "line-token-2"
          }
        },
        tenants: [
          {
            lineUserId: "line-user-2",
            firstName: "สมหวัง",
            lastName: "ใจงาม",
            phoneNumber: "0890001111"
          }
        ]
      }
    };

    vi.mocked(prisma.bill.findMany).mockResolvedValue([mockOverdueBill] as any);
    vi.mocked(sendLineOAMessage).mockResolvedValue({ success: true, messageId: "msg-2" } as any);
    vi.mocked(prisma.bill.update).mockResolvedValue({} as any);

    const req = makeReq("Bearer super-secret-key");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(1);
    expect(data.sent).toBe(1);

    expect(sendLineOAMessage).toHaveBeenCalledWith(
      "line-user-2",
      expect.stringContaining("เลยกำหนดแล้ว 2 วัน"),
      "line-token-2"
    );
    
    // บิลควรถูกอัปเดตเป็น OVERDUE
    expect(prisma.bill.update).toHaveBeenCalledWith({
      where: { id: "bill-2" },
      data: { status: "OVERDUE" },
    });
  });
});
