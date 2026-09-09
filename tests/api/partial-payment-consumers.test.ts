/**
 * tests/api/partial-payment-consumers.test.ts
 *
 * Verifies the 3 consumers of paidAmount listed in docs/plan-partial-payment-accounting.md:
 * 1. src/app/api/tenants/[id]/checkout/route.ts (Move-out settlement)
 * 2. src/app/api/cron/bill-reminder/route.ts (Overdue/Due bill reminder)
 * 3. src/app/actions/dashboard.ts (Outstanding Debt & Revenue Analytics)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  billFindMany: vi.fn(),
  billFindFirst: vi.fn(),
  billAggregate: vi.fn(),
  billUpdate: vi.fn(),
  tenantFindUnique: vi.fn(),
  propertyFindUnique: vi.fn(),
  propertyCount: vi.fn(),
  roomCount: vi.fn(),
  invoiceAggregate: vi.fn(),
  sendLineOAMessage: vi.fn(),
  sendSmsWithAddon: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      findMany: mocks.billFindMany,
      findFirst: mocks.billFindFirst,
      aggregate: mocks.billAggregate,
      update: mocks.billUpdate,
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
    property: {
      findUnique: mocks.propertyFindUnique,
      count: mocks.propertyCount,
    },
    room: {
      count: mocks.roomCount,
    },
    invoice: {
      aggregate: mocks.invoiceAggregate,
    },
  },
}));

vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn().mockImplementation(async () => ({
    bill: {
      findMany: mocks.billFindMany,
      aggregate: mocks.billAggregate,
    },
    property: {
      count: mocks.propertyCount,
    },
    room: {
      count: mocks.roomCount,
    },
  })),
}));

vi.mock("@/lib/line", () => ({
  sendLineOAMessage: mocks.sendLineOAMessage.mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/sms", () => ({
  sendSmsWithAddon: mocks.sendSmsWithAddon.mockResolvedValue({ success: true }),
}));

import { GET as checkoutRoute } from "@/app/api/tenants/[id]/checkout/route";
import { GET as reminderRoute } from "@/app/api/cron/bill-reminder/route";
import { getDashboardMetrics, getRevenueAnalytics } from "@/app/actions/dashboard";

describe("Partial Payment Accounting — Consumers Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Consumer 1: Move-Out Settlement (checkout/route.ts) ───────────────────
  describe("Consumer 1: Checkout Settlement (src/app/api/tenants/[id]/checkout/route.ts)", () => {
    it("คำนวณ outstandingAmount จาก (totalAmount - paidAmount) ถูกต้องเมื่อมีบิล PARTIAL", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { id: "owner-1", role: "OWNER" },
      });

      mocks.tenantFindUnique.mockResolvedValue({
        id: "tenant-1",
        firstName: "สมชาย",
        lastName: "ใจดี",
        depositAmount: 5000,
        moveOutDate: new Date("2026-09-30"),
        room: {
          id: "room-1",
          number: "101",
          rentPrice: 4000,
          waterMeterStart: 10,
          electricMeterStart: 20,
          propertyId: "prop-1",
          property: {
            ownerId: "owner-1",
            waterRate: 18,
            electricRate: 8,
            defaultSecurityDeposit: 5000,
          },
        },
        checkout: null,
      });

      mocks.billFindMany.mockResolvedValue([
        { totalAmount: 5000, paidAmount: 3000 },
        { totalAmount: 4000, paidAmount: 0 },
      ]);

      const req = new Request("http://localhost/api/tenants/tenant-1/checkout");
      const ctx = { params: Promise.resolve({ id: "tenant-1" }) };
      const res = await checkoutRoute(req, ctx);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.suggested.outstandingAmount).toBe(6000);
    });
  });

  // ─── Consumer 2: Bill Reminder (cron/bill-reminder/route.ts) ───────────────
  describe("Consumer 2: Bill Reminder (src/app/api/cron/bill-reminder/route.ts)", () => {
    it("ส่งยอดคงค้าง (totalAmount - paidAmount) ในข้อความ LINE/SMS สำหรับบิล PARTIAL", async () => {
      process.env.CRON_SECRET = "test-secret";

      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 2);

      mocks.billFindMany.mockResolvedValue([
        {
          id: "bill-partial",
          totalAmount: 5000,
          paidAmount: 3000,
          status: "PARTIAL",
          dueDate,
          month: 9,
          year: 2026,
          room: {
            number: "101",
            property: {
              owner: {
                id: "owner-1",
                lineChannelAccessToken: "token-1",
              },
            },
            tenants: [
              {
                firstName: "สมชาย",
                lastName: "ใจดี",
                lineUserId: "line-tenant-1",
                phoneNumber: "0812345678",
              },
            ],
          },
        },
      ]);

      const req = new Request("http://localhost/api/cron/bill-reminder", {
        headers: { authorization: "Bearer test-secret" },
      });
      const res = await reminderRoute(req);

      expect(res.status).toBe(200);
      expect(mocks.sendLineOAMessage).toHaveBeenCalled();
      const sentMsg = mocks.sendLineOAMessage.mock.calls[0][1];
      expect(sentMsg).toContain("ยอดคงค้าง: ฿2,000");

      if (mocks.sendSmsWithAddon.mock.calls.length > 0) {
        const smsMsg = mocks.sendSmsWithAddon.mock.calls[0][2];
        expect(smsMsg).toContain("ยอด ฿2,000");
      }
    });
  });

  // ─── Consumer 3: Dashboard Metrics (src/app/actions/dashboard.ts) ───────────
  describe("Consumer 3: Dashboard Metrics (src/app/actions/dashboard.ts)", () => {
    it("getDashboardMetrics รวมบิล PARTIAL เข้ายอดหนี้คงค้าง โดยหัก paidAmount ออก", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { id: "owner-1", role: "OWNER" },
      });

      mocks.billAggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 10000, electricAmount: 1000, waterAmount: 500 },
      });

      mocks.billAggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 15000, paidAmount: 4000 },
      });

      mocks.propertyCount.mockResolvedValue(1);
      mocks.roomCount.mockResolvedValue(10);
      mocks.invoiceAggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

      const res = await getDashboardMetrics(9, 2026);

      expect(res.success).toBe(true);
      expect(res.data?.totalRevenue).toBe(10000);
      expect(res.data?.outstandingDebt).toBe(11000);
    });

    it("getRevenueAnalytics รวมบิล PARTIAL และหัก paidAmount ออกจากยอดคงค้าง", async () => {
      mocks.billAggregate.mockImplementation(async (args: any) => {
        if (args.where.status === "PAID") {
          return { _sum: { totalAmount: 8000 } };
        }
        return { _sum: { totalAmount: 6000, paidAmount: 2500 } };
      });

      const res = await getRevenueAnalytics();

      expect(res.success).toBe(true);
      if (res.success && res.data) {
        for (const item of res.data) {
          expect(item.revenue).toBe(8000);
          expect(item.outstanding).toBe(3500);
        }
      }
    });
  });
});
