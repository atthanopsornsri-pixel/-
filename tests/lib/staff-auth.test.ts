import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * canAccessProperty — helper กลางคุมสิทธิ์ STAFF/OWNER ในไฟล์ที่ใช้ raw prisma
 * ทดสอบทุก role branch โดย mock prisma.propertyStaff.findUnique (DB-free)
 */
const h = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { propertyStaff: { findUnique: h.findUnique } },
}));

import { canAccessProperty, isOwnerOrStaff } from "@/lib/staff-auth";

beforeEach(() => vi.clearAllMocks());

describe("canAccessProperty · ADMIN", () => {
  it("ADMIN เข้าถึงได้ทุก property โดยไม่ยิง query", async () => {
    const ok = await canAccessProperty("ADMIN", "u1", "someOwner", "prop1");
    expect(ok).toBe(true);
    expect(h.findUnique).not.toHaveBeenCalled();
  });
});

describe("canAccessProperty · OWNER", () => {
  it("OWNER เข้าถึงได้ถ้า ownerId === ตัวเอง (ไม่ยิง query)", async () => {
    const ok = await canAccessProperty("OWNER", "owner1", "owner1", "prop1");
    expect(ok).toBe(true);
    expect(h.findUnique).not.toHaveBeenCalled();
  });

  it("OWNER ถูกปฏิเสธถ้าเป็นเจ้าของหออื่น (cross-owner IDOR)", async () => {
    const ok = await canAccessProperty("OWNER", "owner1", "owner2", "prop1");
    expect(ok).toBe(false);
    expect(h.findUnique).not.toHaveBeenCalled();
  });
});

describe("canAccessProperty · STAFF", () => {
  it("STAFF เข้าถึงได้เฉพาะตึกที่ถูก assign (มี PropertyStaff row)", async () => {
    h.findUnique.mockResolvedValue({ id: "ps1", userId: "staff1", propertyId: "prop1" });
    const ok = await canAccessProperty("STAFF", "staff1", "owner1", "prop1");
    expect(ok).toBe(true);
    expect(h.findUnique).toHaveBeenCalledWith({
      where: { userId_propertyId: { userId: "staff1", propertyId: "prop1" } },
    });
  });

  it("STAFF ถูกปฏิเสธถ้าไม่ได้ถูก assign ให้ตึกนั้น (cross-property isolation)", async () => {
    h.findUnique.mockResolvedValue(null);
    const ok = await canAccessProperty("STAFF", "staff1", "owner1", "propOther");
    expect(ok).toBe(false);
  });
});

describe("canAccessProperty · TENANT / unknown role", () => {
  it("TENANT ถูกปฏิเสธเสมอ", async () => {
    expect(await canAccessProperty("TENANT", "t1", "owner1", "prop1")).toBe(false);
  });
  it("role แปลกปลอมถูกปฏิเสธเสมอ (default deny)", async () => {
    expect(await canAccessProperty("SOMETHING", "x", "owner1", "prop1")).toBe(false);
  });
});

describe("isOwnerOrStaff", () => {
  it("true เฉพาะ OWNER/STAFF", () => {
    expect(isOwnerOrStaff("OWNER")).toBe(true);
    expect(isOwnerOrStaff("STAFF")).toBe(true);
    expect(isOwnerOrStaff("ADMIN")).toBe(false);
    expect(isOwnerOrStaff("TENANT")).toBe(false);
    expect(isOwnerOrStaff(undefined)).toBe(false);
  });
});
