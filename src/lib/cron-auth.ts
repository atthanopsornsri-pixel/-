/**
 * Cron endpoint authentication — FAIL-CLOSED
 * ============================================
 * Vercel Cron ส่ง header `Authorization: Bearer <CRON_SECRET>` มาให้
 *
 * สำคัญ: ถ้า CRON_SECRET ไม่ถูกตั้งค่าใน environment → ปฏิเสธคำขอทันที (fail-closed)
 * แทนที่จะปล่อยผ่าน (fail-open) — กันกรณีลืมตั้ง env var ตอน deploy แล้วทำให้
 * cron endpoint เปิดโล่งให้ใครก็ trigger ได้โดยไม่รู้ตัว
 */

import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

/**
 * ตรวจ auth ของ cron request
 * @returns NextResponse (401/503) ถ้าไม่ผ่าน, หรือ null ถ้าผ่าน (ให้ handler ทำงานต่อ)
 */
export function checkCronAuth(req: Request, route: string): NextResponse | null {
  const expected = process.env.CRON_SECRET;

  // FAIL-CLOSED: ไม่มี secret ตั้งไว้ = ปฏิเสธ + แจ้งเตือน admin ทันที
  if (!expected) {
    logError(
      "CRON_SECRET ไม่ถูกตั้งค่า — cron endpoint ถูกปฏิเสธเพื่อความปลอดภัย (fail-closed)",
      new Error("Missing CRON_SECRET"),
      { route }
    );
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
