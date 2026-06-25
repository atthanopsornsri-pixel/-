/**
 * tests/api/accept-pdpa.test.ts
 * POST /api/users/accept-pdpa — ยอมรับข้อกำหนด PDPA
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/users/accept-pdpa/route";

// ─── mocks ───────────────────────────────────────────────────────────────────
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const ownerSession = { user: { id: "owner-1", email: "owner@test.com" } };

describe("POST /api/users/accept-pdpa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ไม่ได้ล็อกอิน → 401 Unauthorized", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new Request("http://localhost/api/users/accept-pdpa", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toBe("Unauthorized");
  });

  it("ล็อกอินสำเร็จ → อัปเดต pdpaAcceptedAt ในฐานข้อมูล", async () => {
    vi.mocked(getServerSession).mockResolvedValue(ownerSession);

    const now = new Date();
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "owner-1",
      pdpaAcceptedAt: now,
    } as any);

    const req = new Request("http://localhost/api/users/accept-pdpa", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(new Date(data.pdpaAcceptedAt).getTime()).toBe(now.getTime());

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "owner-1" },
      data: { pdpaAcceptedAt: expect.any(Date) },
    });
  });
});
