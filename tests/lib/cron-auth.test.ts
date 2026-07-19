import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * checkCronAuth — fail-CLOSED auth guard สำหรับ cron endpoints (finding C01)
 * ยืนยันว่า "ไม่มี CRON_SECRET = ปฏิเสธ" ไม่ใช่ "ปล่อยผ่าน"
 */
vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

import { checkCronAuth } from "@/lib/cron-auth";

const OLD_ENV = process.env.CRON_SECRET;
beforeEach(() => vi.clearAllMocks());
afterEach(() => { process.env.CRON_SECRET = OLD_ENV; });

function reqWith(auth?: string): Request {
  return new Request("https://x.test/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("checkCronAuth · fail-closed", () => {
  it("CRON_SECRET ไม่ถูกตั้ง → 503 (ปฏิเสธ ไม่ปล่อยผ่าน)", async () => {
    delete process.env.CRON_SECRET;
    const res = checkCronAuth(reqWith("Bearer whatever"), "/api/cron/x");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it("CRON_SECRET = empty string → 503 (นับว่าไม่ได้ตั้ง)", async () => {
    process.env.CRON_SECRET = "";
    const res = checkCronAuth(reqWith("Bearer whatever"), "/api/cron/x");
    expect(res!.status).toBe(503);
  });
});

describe("checkCronAuth · authorized/unauthorized", () => {
  it("header ไม่ตรง → 401", async () => {
    process.env.CRON_SECRET = "secret123";
    const res = checkCronAuth(reqWith("Bearer wrong"), "/api/cron/x");
    expect(res!.status).toBe(401);
  });

  it("ไม่มี header เลย → 401", async () => {
    process.env.CRON_SECRET = "secret123";
    const res = checkCronAuth(reqWith(), "/api/cron/x");
    expect(res!.status).toBe(401);
  });

  it("header ตรง → null (ผ่าน ให้ handler ทำงานต่อ)", async () => {
    process.env.CRON_SECRET = "secret123";
    const res = checkCronAuth(reqWith("Bearer secret123"), "/api/cron/x");
    expect(res).toBeNull();
  });
});
