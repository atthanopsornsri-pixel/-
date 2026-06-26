import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";

// Hoist mock setup to prevent initialization reference errors
const h = vi.hoisted(() => {
  const mockPrisma = {
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bill: {
      aggregate: vi.fn(),
    },
    property: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    room: {
      count: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
    },
  };
  return { mockPrisma };
});

// Mocks
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: h.mockPrisma,
}));

vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn().mockResolvedValue(h.mockPrisma),
}));

import { getNotifications, markNotificationAsRead } from "@/app/actions/notifications";
import { getActiveDeposits, processDepositRefund, processDepositDeduction } from "@/app/actions/deposits";
import { getDashboardMetrics } from "@/app/actions/dashboard";

describe("High Impact Features - Notifications Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getNotifications - กรองตาม userId ของผู้ใช้ที่ล็อกอินเท่านั้น", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-123" } });
    h.mockPrisma.notification.findMany.mockResolvedValue([{ id: "n1", userId: "user-123", title: "Test" }]);

    const res = await getNotifications();
    expect(res.success).toBe(true);
    expect(h.mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  });

  it("markNotificationAsRead - กรองตาม id และ userId ป้องกัน IDOR", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-123" } });
    h.mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const res = await markNotificationAsRead("n1");
    expect(res.success).toBe(true);
    expect(h.mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-123" },
      data: { read: true },
    });
  });

  it("markNotificationAsRead - หากอัปเดต 0 รายการ (ไม่พบหรือไม่มีสิทธิ์) ให้คืนค่าผิดพลาด", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-123" } });
    h.mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const res = await markNotificationAsRead("n1");
    expect(res.success).toBe(false);
    expect(res.error).toBe("ไม่พบรายการแจ้งเตือน หรือไม่มีสิทธิ์เข้าถึง");
  });
});

describe("High Impact Features - Deposit Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processDepositRefund - ปฏิเสธค่าที่ต่ำกว่าหรือเท่ากับ 0", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } });
    const res = await processDepositRefund("tenant-1", -100);
    expect(res.success).toBe(false);
    expect(res.error).toBe("จำนวนเงินที่คืนต้องมากกว่า 0 บาท");
  });

  it("processDepositRefund - ปฏิเสธการคืนเงินเกินจำนวนประกันคงเหลือ", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } });
    h.mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1", depositAmount: 5000 });

    const res = await processDepositRefund("tenant-1", 6000);
    expect(res.success).toBe(false);
    expect(res.error).toBe("จำนวนเงินคืนเกินยอดประกันคงเหลือ");
  });

  it("processDepositRefund - อัปเดตเงินคืนลดลงถูกต้อง", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } });
    h.mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1", depositAmount: 5000 });
    h.mockPrisma.tenant.update.mockResolvedValue({ id: "tenant-1", depositAmount: 3000 });

    const res = await processDepositRefund("tenant-1", 2000);
    expect(res.success).toBe(true);
    expect(h.mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: {
        depositAmount: {
          decrement: 2000,
        },
      },
    });
  });

  it("processDepositDeduction - หักค่าเสียหายต้องระบุเหตุผลและไม่เกินยอดประกัน", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } });
    h.mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1", depositAmount: 5000 });

    const resNoReason = await processDepositDeduction("tenant-1", 1000, "");
    expect(resNoReason.success).toBe(false);
    expect(resNoReason.error).toBe("กรุณาระบุเหตุผลในการหักเงินประกัน");

    const resTooMuch = await processDepositDeduction("tenant-1", 7000, "ค่าบำรุงรักษา");
    expect(resTooMuch.success).toBe(false);
    expect(resTooMuch.error).toBe("จำนวนเงินหักเกินยอดประกันคงเหลือ");
  });
});

describe("High Impact Features - Property Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDashboardMetrics - ซ่อน SaaS Fee เมื่อระบุ propertyId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } });
    h.mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { totalAmount: 10000, electricAmount: 1000, waterAmount: 500 } });
    h.mockPrisma.property.count.mockResolvedValue(1);
    h.mockPrisma.room.count.mockResolvedValue(10);
    h.mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 499 } });

    // 1. แบบไม่ระบุ propertyId
    const resAll = await getDashboardMetrics(undefined, undefined, undefined);
    expect(resAll.success).toBe(true);
    expect(resAll.data?.saasExpenseHidden).toBe(false);

    // 2. แบบระบุ propertyId
    const resFiltered = await getDashboardMetrics(undefined, undefined, "prop-1");
    expect(resFiltered.success).toBe(true);
    expect(resFiltered.data?.saasExpense).toBe(0);
    expect(resFiltered.data?.saasExpenseHidden).toBe(true);
  });
});
