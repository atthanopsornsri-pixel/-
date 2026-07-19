/**
 * tests/api/cron-backup.test.ts
 * GET /api/cron/backup — daily DB snapshot → Supabase Storage
 * Protected by CRON_SECRET
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/cron/backup/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    property: { findMany: vi.fn() },
    propertyStaff: { findMany: vi.fn() },
    room: { findMany: vi.fn() },
    tenant: { findMany: vi.fn() },
    vehicle: { findMany: vi.fn() },
    bill: { findMany: vi.fn() },
    checkout: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    maintenanceRequest: { findMany: vi.fn() },
    parcel: { findMany: vi.fn() },
    meterSubmission: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    smsAddon: { findMany: vi.fn() },
    systemSettings: { findMany: vi.fn() },
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeReq(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers["authorization"] = authHeader;
  return new Request("http://localhost/api/cron/backup", { headers });
}

const mockData = {
  users: [{ id: "u1", email: "test@example.com", name: "Test", role: "OWNER", planTier: "FREE_TRIAL", planExpiresAt: null, createdAt: new Date() }],
  properties: [],
  rooms: [],
  bills: [],
  tenants: [],
  invoices: [],
};

function setupPrismaOk() {
  vi.mocked(prisma.user.findMany).mockResolvedValue(mockData.users as any);
  vi.mocked(prisma.property.findMany).mockResolvedValue([]);
  vi.mocked(prisma.propertyStaff.findMany).mockResolvedValue([]);
  vi.mocked(prisma.room.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tenant.findMany).mockResolvedValue([]);
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue([]);
  vi.mocked(prisma.bill.findMany).mockResolvedValue([]);
  vi.mocked(prisma.checkout.findMany).mockResolvedValue([]);
  vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.maintenanceRequest.findMany).mockResolvedValue([]);
  vi.mocked(prisma.parcel.findMany).mockResolvedValue([]);
  vi.mocked(prisma.meterSubmission.findMany).mockResolvedValue([]);
  vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
  vi.mocked(prisma.smsAddon.findMany).mockResolvedValue([]);
  vi.mocked(prisma.systemSettings.findMany).mockResolvedValue([]);
}

function setupSupabaseOk() {
  const uploadMock = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createClient).mockReturnValue({
    storage: { from: vi.fn().mockReturnValue({ upload: uploadMock }) },
  } as any);
  return uploadMock;
}

// ─── tests ────────────────────────────────────────────────────────────────────
describe("GET /api/cron/backup — daily backup", () => {
  const ORIGINAL_ENV = process.env;

  const SECRET = "secret-token";
  // makeReq ที่แนบ token ถูกต้องเสมอ (default: auth ผ่าน) — ใช้ในเทสที่ไม่ได้เช็ค auth
  const authReq = () => makeReq(`Bearer ${SECRET}`);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "fake-key",
      CRON_SECRET: SECRET, // fail-closed: ต้องมี secret เสมอ (C01)
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("ไม่ตั้ง CRON_SECRET → 503 ปฏิเสธ (fail-closed, C01)", async () => {
    process.env.CRON_SECRET = undefined;
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });

  it("ตั้ง CRON_SECRET + ส่ง token ถูก → 200", async () => {
    setupPrismaOk();
    setupSupabaseOk();
    const res = await GET(authReq());
    expect(res.status).toBe(200);
  });

  it("ตั้ง CRON_SECRET + ไม่ส่ง Authorization → 401", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("ตั้ง CRON_SECRET + ส่ง token ผิด → 401", async () => {
    const res = await GET(makeReq("Bearer wrong-token"));
    expect(res.status).toBe(401);
  });

  it("ไม่ตั้ง SUPABASE env → 503", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    const res = await GET(authReq());
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/not configured/);
  });

  it("backup สำเร็จ → 200 + counts object", async () => {
    setupPrismaOk();
    setupSupabaseOk();
    const res = await GET(authReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.counts).toBeDefined();
    expect(data.counts.users).toBe(1);
    expect(data.filename).toMatch(/backups\/\d{4}-\d{2}-\d{2}\.json/);
  });

  it("ไม่บันทึก password/token ลง snapshot — เช็ค shape ที่ส่ง Supabase", async () => {
    setupPrismaOk();
    const uploadMock = setupSupabaseOk();
    await GET(authReq());
    const uploadedBody = uploadMock.mock.calls[0][1] as string;
    const snapshot = JSON.parse(uploadedBody);
    // users ต้องไม่มี field password/lineChannelAccessToken
    const user = snapshot.data.users[0];
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("lineChannelAccessToken");
  });

  it("Supabase upload ล้มเหลว → 500", async () => {
    setupPrismaOk();
    vi.mocked(createClient).mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: new Error("storage error") }),
        }),
      },
    } as any);
    const res = await GET(authReq());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("Prisma throw → 500", async () => {
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error("db down"));
    setupSupabaseOk();
    const res = await GET(authReq());
    expect(res.status).toBe(500);
  });
});
