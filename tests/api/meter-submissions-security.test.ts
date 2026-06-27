import { describe, it, expect, beforeEach, vi } from "vitest";

// ปิด gap ของ meter-submissions.test.ts: Owner IDOR (approve/reject ห้องคนอื่น) + double-approval
// — ทั้งสองอยู่ใน test plan แต่ test เดิมครอบแค่ happy path
const h = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  subFindUnique: vi.fn(),
  subUpdate: vi.fn(),
  roomFindFirst: vi.fn(),
  saveBulk: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/line", () => ({ sendLineOAMessage: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/app/actions/notifications", () => ({ createDbNotification: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/app/actions/meters", () => ({ saveBulkMeterReadings: h.saveBulk }));
vi.mock("@/lib/prisma", () => ({
  prisma: { meterSubmission: { findUnique: h.subFindUnique, update: h.subUpdate } },
}));
vi.mock("@/lib/prisma-secure", () => ({
  getSecurePrisma: vi.fn().mockResolvedValue({ room: { findFirst: h.roomFindFirst } }),
}));

import { approveMeterSubmission, rejectMeterSubmission } from "@/app/actions/meter-submissions";

const ownerSession = { user: { id: "owner-A", role: "OWNER" } };
const pendingSub = {
  id: "sub-1", roomId: "room-x", month: 6, year: 2025, type: "WATER", reading: 150,
  status: "PENDING", tenant: { userId: "u1", lineUserId: null },
  room: { number: "101", property: { owner: { lineChannelAccessToken: null } } },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.getServerSession.mockResolvedValue(ownerSession);
  h.subUpdate.mockResolvedValue({});
  h.saveBulk.mockResolvedValue({ success: true });
});

describe("approveMeterSubmission — IDOR & double-approval", () => {
  it("SECURITY: ห้องไม่ใช่ของ owner (secureDb.room null) → ปฏิเสธ ไม่เขียนบิล/ไม่อนุมัติ", async () => {
    h.subFindUnique.mockResolvedValue(pendingSub);
    h.roomFindFirst.mockResolvedValue(null); // RLS: ไม่ใช่ห้องของ owner นี้
    const res = await approveMeterSubmission("sub-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("ไม่มีสิทธิ์");
    expect(h.saveBulk).not.toHaveBeenCalled();
    expect(h.subUpdate).not.toHaveBeenCalled();
  });

  it("อนุมัติซ้ำ (status APPROVED แล้ว) → ปฏิเสธ ไม่เรียก saveBulkMeterReadings", async () => {
    h.subFindUnique.mockResolvedValue({ ...pendingSub, status: "APPROVED" });
    h.roomFindFirst.mockResolvedValue({ id: "room-x", number: "101", propertyId: "p1" });
    const res = await approveMeterSubmission("sub-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("ดำเนินการไปแล้ว");
    expect(h.saveBulk).not.toHaveBeenCalled();
    expect(h.subUpdate).not.toHaveBeenCalled();
  });

  it("PENDING + เป็นห้องของ owner → อนุมัติได้ (เขียนบิล + update)", async () => {
    h.subFindUnique.mockResolvedValue(pendingSub);
    h.roomFindFirst.mockResolvedValue({ id: "room-x", number: "101", propertyId: "p1" });
    const res = await approveMeterSubmission("sub-1");
    expect(res.success).toBe(true);
    expect(h.saveBulk).toHaveBeenCalled();
    expect(h.subUpdate).toHaveBeenCalled();
  });
});

describe("rejectMeterSubmission — IDOR", () => {
  it("SECURITY: ห้องไม่ใช่ของ owner → ปฏิเสธ ไม่ update", async () => {
    h.subFindUnique.mockResolvedValue(pendingSub);
    h.roomFindFirst.mockResolvedValue(null);
    const res = await rejectMeterSubmission("sub-1", "เลขไม่ตรงรูป");
    expect(res.success).toBe(false);
    expect(res.error).toContain("ไม่มีสิทธิ์");
    expect(h.subUpdate).not.toHaveBeenCalled();
  });
});
