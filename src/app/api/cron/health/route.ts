import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check + DB connectivity check
 * Vercel Cron: ทุก 10 นาที (ตั้งใน vercel.json)
 * Protected: CRON_SECRET header
 *
 * ถ้า DB ตายหรือ query ช้าผิดปกติ → แจ้ง LINE Admin อัตโนมัติผ่าน logError()
 */
export async function GET(req: Request) {
  // Auth: Vercel Cron ส่ง Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  try {
    // เช็ค DB connectivity + รับสถิติพื้นฐาน
    const [userCount, roomCount, billCount] = await Promise.all([
      prisma.user.count(),
      prisma.room.count({ where: { isDeleted: false } }),
      prisma.bill.count({ where: { isDeleted: false, status: { in: ["UNPAID", "OVERDUE"] } } }),
    ]);

    const latencyMs = Date.now() - start;

    // แจ้งเตือนถ้า DB ตอบสนองช้าเกิน 3 วินาที
    if (latencyMs > 3000) {
      logError("DB latency สูงผิดปกติ", new Error(`${latencyMs}ms`), { route: "/api/cron/health" });
    }

    return NextResponse.json({
      status: "ok",
      latencyMs,
      stats: { userCount, roomCount, unpaidBills: billCount },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError("Health check ล้มเหลว — DB อาจไม่สามารถเข้าถึงได้", error, { route: "/api/cron/health" });
    return NextResponse.json({ status: "error", message: "DB connection failed" }, { status: 503 });
  }
}
