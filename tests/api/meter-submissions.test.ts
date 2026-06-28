import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitMeterReading, getPendingSubmissions, approveMeterSubmission, rejectMeterSubmission } from "@/app/actions/meter-submissions";
import { GET as getTenantSubmissions, POST as postTenantSubmission } from "@/app/api/tenant/meter-submission/route";
import { GET as getMeterReminderCron } from "@/app/api/cron/meter-reminder/route";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { getServerSession } from "next-auth";
import { sendLineOAMessage } from "@/lib/line";
import { saveBulkMeterReadings } from "@/app/actions/meters";

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    meterSubmission: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    bill: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/line", () => ({
  sendLineOAMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/actions/meters", () => ({
  saveBulkMeterReadings: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/actions/notifications", () => ({
  createDbNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Tenant Self-Reporting Meter System Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
  });

  describe("Server Actions - submitMeterReading", () => {
    it("บันทึกสำเร็จเมื่อข้อมูลถูกต้องและอยู่ในช่วงเวลาที่เปิดระบบ", async () => {
      // Setup session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "TENANT" },
      });

      // Tenant lookup with nested room & property
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        id: "tenant-1",
        roomId: "room-1",
        isDeleted: false,
        room: {
          id: "room-1",
          property: {
            id: "prop-1",
            enableTenantReport: true,
            reportStartDay: 1,
            reportEndDay: 28,
          }
        }
      } as any);

      // Previous reading lookup from bills
      vi.mocked(prisma.bill.findFirst).mockResolvedValue({
        waterReading: 100,
        electricReading: 200,
      } as any);

      // Submission status check
      vi.mocked(prisma.meterSubmission.findFirst).mockResolvedValue(null);

      // Upsert mock
      const mockResult = { id: "sub-1", reading: 120, type: "WATER", status: "PENDING" };
      vi.mocked(prisma.meterSubmission.upsert).mockResolvedValue(mockResult as any);

      const result = await submitMeterReading(120, "WATER");

      expect(result.success).toBe(true);
      expect(result.submission).toEqual(mockResult);
    });

    it("บันทึกไม่สำเร็จหากผู้ใช้ไม่ใช่ TENANT", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "OWNER" },
      });

      const result = await submitMeterReading(120, "WATER");
      expect(result.success).toBe(false);
      expect(result.error).toContain("ลูกบ้าน");
    });

    it("ปฏิเสธการส่งหากเลขมิเตอร์น้อยกว่าครั้งก่อนหน้า", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "TENANT" },
      });

      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        id: "tenant-1",
        roomId: "room-1",
        isDeleted: false,
        room: {
          id: "room-1",
          property: {
            id: "prop-1",
            enableTenantReport: true,
            reportStartDay: 1,
            reportEndDay: 28,
          }
        }
      } as any);

      vi.mocked(prisma.bill.findFirst).mockResolvedValue({
        waterReading: 150,
      } as any);

      vi.mocked(prisma.meterSubmission.findFirst).mockResolvedValue(null);

      const result = await submitMeterReading(140, "WATER");
      expect(result.success).toBe(false);
      expect(result.error).toContain("ต่ำกว่าเลขหน่วยครั้งก่อนหน้า");
    });
  });

  describe("Server Actions - approveMeterSubmission", () => {
    it("อนุมัติสำเร็จ ยืนยันสิทธิ์หอพัก และเรียก saveBulkMeterReadings", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "owner-1", role: "OWNER" },
      });

      const mockSubmission = {
        id: "sub-1",
        roomId: "room-1",
        tenantId: "tenant-1",
        type: "WATER",
        reading: 150,
        status: "PENDING",
        month: 6,
        year: 2025,
        tenant: {
          userId: "user-tenant-1",
        },
      };

      vi.mocked(prisma.meterSubmission.findUnique).mockResolvedValue(mockSubmission as any);

      // Mock secureDb for RLS verification
      const mockSecureDb = {
        room: {
          findFirst: vi.fn().mockResolvedValue({ id: "room-1", number: "101" }),
        },
      };
      vi.mocked(getSecurePrisma).mockResolvedValue(mockSecureDb as any);

      vi.mocked(prisma.meterSubmission.update).mockResolvedValue({ ...mockSubmission, status: "APPROVED" } as any);

      const result = await approveMeterSubmission("sub-1");

      expect(result.success).toBe(true);
      expect(saveBulkMeterReadings).toHaveBeenCalled();
      expect(prisma.meterSubmission.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: {
          status: "APPROVED",
          approvedAt: expect.any(Date),
        },
      });
    });
  });

  describe("API Routes - GET & POST /api/tenant/meter-submission", () => {
    it("POST ส่งมิเตอร์เรียกใช้ submitMeterReading", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "TENANT" },
      });

      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        id: "tenant-1",
        roomId: "room-1",
        isDeleted: false,
        room: {
          id: "room-1",
          property: {
            id: "prop-1",
            enableTenantReport: true,
            reportStartDay: 1,
            reportEndDay: 28,
          }
        }
      } as any);

      vi.mocked(prisma.bill.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.meterSubmission.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.meterSubmission.upsert).mockResolvedValue({
        id: "sub-1",
        reading: 100,
        type: "WATER",
        status: "PENDING",
      } as any);

      const req = new Request("http://localhost/api/tenant/meter-submission", {
        method: "POST",
        body: JSON.stringify({ reading: 100, type: "WATER", photoUrl: "http://photo.url" }),
      });

      const res = await postTenantSubmission(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("API Routes - Cron /api/cron/meter-reminder", () => {
    it("Cron เช็กความถูกต้องของ Token และส่งข้อความ LINE OA แก่ลูกบ้านที่ยังจดไม่ครบ", async () => {
      process.env.CRON_SECRET = "cron-token";

      // Mock properties setup
      vi.mocked(prisma.property.findMany).mockResolvedValue([
        {
          id: "prop-1",
          enableTenantReport: true,
          reportEndDay: 24,
          owner: {
            lineChannelAccessToken: "owner-line-token",
          },
          rooms: [
            {
              id: "room-1",
              number: "101",
              status: "OCCUPIED",
              tenants: [
                {
                  id: "tenant-1",
                  lineUserId: "tenant-line-id",
                },
              ],
            },
          ],
        },
      ] as any);

      // Mock no submissions done yet (empty array)
      vi.mocked(prisma.meterSubmission.findMany).mockResolvedValue([]);

      const req = new Request("http://localhost/api/cron/meter-reminder", {
        method: "GET",
        headers: { authorization: "Bearer cron-token" },
      });

      const res = await getMeterReminderCron(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.remindersSent).toBe(1);
      expect(sendLineOAMessage).toHaveBeenCalledWith(
        "tenant-line-id",
        expect.stringContaining("มิเตอร์น้ำ และ มิเตอร์ไฟ"),
        "owner-line-token"
      );
    });
  });
});
