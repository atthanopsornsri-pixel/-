import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to declare mocks before they are referenced in hoisted vi.mock calls
const h = vi.hoisted(() => {
  const mockPrisma = {
    invoice: {
      aggregate: vi.fn(),
    },
    property: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bill: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  };

  const mockSecurePrisma = {
    bill: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    property: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    room: {
      count: vi.fn(),
    },
  };

  const getServerSession = vi.fn();

  return { mockPrisma, mockSecurePrisma, getServerSession };
});

// Mock next-auth and Prisma
vi.mock("next-auth", () => ({
  getServerSession: h.getServerSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: h.mockPrisma,
}));

vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn().mockResolvedValue(h.mockSecurePrisma),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Now import the modules under test
import { getDashboardMetrics } from "@/app/actions/dashboard";
import { getMeterHistory } from "@/app/actions/meters";
import { PATCH as patchRoom } from "@/app/api/rooms/[id]/route";

describe("JadHor OS Completion - Automated Security & Feature Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Smart Dashboard (Cashflow) Security", () => {
    it("getDashboardMetrics scope SaaS Invoices manually by ownerId", async () => {
      // Setup session
      const mockSession = { user: { id: "owner-123", role: "OWNER" } };
      h.getServerSession.mockResolvedValue(mockSession);

      // Mock database calls
      h.mockSecurePrisma.bill.aggregate.mockResolvedValue({ _sum: { totalAmount: 10000, electricAmount: 1000, waterAmount: 500 } });
      h.mockSecurePrisma.property.count.mockResolvedValue(1);
      h.mockSecurePrisma.room.count.mockResolvedValue(10);
      h.mockSecurePrisma.room.count.mockResolvedValue(8);
      h.mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });

      const res = await getDashboardMetrics(6, 2026);

      expect(res.success).toBe(true);
      
      // Verify raw prisma invoice query was called with strict manual ownerId scoping
      expect(h.mockPrisma.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: "owner-123",
            status: "PAID",
            month: 6,
            year: 2026,
          }),
        })
      );
      
      // Verify calculations
      expect(res.data).toBeDefined();
      expect(res.data?.estElectricCost).toBe(600); // 60% of 1000
      expect(res.data?.estWaterCost).toBe(350); // 70% of 500
      expect(res.data?.saasExpense).toBe(500);
      expect(res.data?.totalEstExpenses).toBe(600 + 350 + 500); // 1450
      expect(res.data?.estNetProfit).toBe(10000 - 1450); // 8550
    });
  });

  describe("2. Meter History IDOR Prevention", () => {
    it("getMeterHistory returns error if property not found or does not belong to owner", async () => {
      // Setup session
      const mockSession = { user: { id: "owner-123", role: "OWNER" } };
      h.getServerSession.mockResolvedValue(mockSession);

      // Mock getSecurePrisma property query to return null (no access)
      h.mockSecurePrisma.property.findFirst.mockResolvedValue(null);

      const res = await getMeterHistory("unauthorized-property-id");

      expect(res.success).toBe(false);
      expect(res.error).toContain("ไม่มีสิทธิ์เข้าถึง");
      expect(h.mockSecurePrisma.bill.findMany).not.toHaveBeenCalled();
    });

    it("getMeterHistory allows query if property belongs to owner", async () => {
      // Setup session
      const mockSession = { user: { id: "owner-123", role: "OWNER" } };
      h.getServerSession.mockResolvedValue(mockSession);

      // Mock property exists
      h.mockSecurePrisma.property.findFirst.mockResolvedValue({ id: "prop-123" });
      h.mockSecurePrisma.bill.findMany.mockResolvedValue([]);

      const res = await getMeterHistory("prop-123");

      expect(res.success).toBe(true);
      expect(h.mockSecurePrisma.bill.findMany).toHaveBeenCalled();
    });
  });

  describe("3. Room Gallery PATCH Validation", () => {
    it("PATCH room updates all 4 image fields and validates ownership", async () => {
      // Setup session
      const mockSession = { user: { id: "owner-123", role: "OWNER" } };
      h.getServerSession.mockResolvedValue(mockSession);

      // Mock room lookup and property ownership verification
      h.mockPrisma.room.findUnique.mockResolvedValue({
        id: "room-abc",
        property: { ownerId: "owner-123" },
      });
      h.mockPrisma.room.update.mockResolvedValue({ id: "room-abc" });

      const request = new Request("http://localhost/api/rooms/room-abc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: "101",
          floor: "1",
          rentPrice: 4500,
          status: "AVAILABLE",
          waterMeterStart: 0,
          electricMeterStart: 100,
          hasAircon: true,
          hasFan: false,
          hasFurniture: true,
          imageMain: "main.jpg",
          imageBathroom: "bathroom.jpg",
          imageBalcony: "balcony.jpg",
          imageFacility: "facility.jpg",
        }),
      });

      const res = await patchRoom(request, { params: Promise.resolve({ id: "room-abc" }) });
      expect(res.status).toBe(200);

      // Verify DB update contains the 4 image fields
      expect(h.mockPrisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "room-abc" },
          data: expect.objectContaining({
            imageMain: "main.jpg",
            imageBathroom: "bathroom.jpg",
            imageBalcony: "balcony.jpg",
            imageFacility: "facility.jpg",
          }),
        })
      );
    });
  });
});
