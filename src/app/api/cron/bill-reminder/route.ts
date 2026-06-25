import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { sendSmsWithAddon } from "@/lib/sms";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/bill-reminder
 * ส่งแจ้งเตือนบิลค้างชำระผ่าน LINE + SMS อัตโนมัติ
 * Vercel Cron: ทุกวัน 08:00 UTC (15:00 เวลาไทย)
 * Protected: CRON_SECRET
 *
 * เงื่อนไขแจ้งเตือน:
 *  - บิลสถานะ UNPAID หรือ PARTIAL
 *  - dueDate เหลืออีก 3 วัน (early reminder) หรือเลยกำหนดไปแล้ว 1-7 วัน (overdue)
 *  - ผู้เช่าต้องผูก LINE หรือมีเบอร์โทร
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://jadhor.vercel.app";

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // ช่วง: เหลืออีก 3 วัน (early) และเลยกำหนดแล้ว 1-7 วัน (overdue)
    const earlyDate = new Date(todayStart);
    earlyDate.setDate(earlyDate.getDate() + 3);

    const overdueStart = new Date(todayStart);
    overdueStart.setDate(overdueStart.getDate() - 7);

    const unpaidBills = await prisma.bill.findMany({
      where: {
        isDeleted: false,
        status: { in: ["UNPAID", "PARTIAL"] },
        OR: [
          // Early reminder: due ภายใน 3 วัน
          { dueDate: { gte: todayStart, lte: earlyDate } },
          // Overdue reminder: เลยกำหนดแล้ว 1-7 วัน
          { dueDate: { gte: overdueStart, lt: todayStart } },
        ],
      },
      include: {
        room: {
          include: {
            property: {
              include: { owner: { select: { lineChannelAccessToken: true, id: true } } },
            },
            tenants: {
              where: { isDeleted: false },
              select: {
                lineUserId: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const bill of unpaidBills) {
      const tenant = bill.room?.tenants?.[0];
      if (!tenant) continue;

      const lineToken = bill.room?.property?.owner?.lineChannelAccessToken;
      const ownerId = bill.room?.property?.owner?.id;

      const tenantName =
        [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") ||
        tenant.phoneNumber ||
        "ผู้เช่า";

      const dueDate = new Date(bill.dueDate);
      const diffDays = Math.round((dueDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
      const yearBE = bill.year + 543;

      const isOverdue = diffDays < 0;
      const daysText = isOverdue
        ? `เลยกำหนดแล้ว ${Math.abs(diffDays)} วัน ⚠️`
        : `เหลืออีก ${diffDays} วัน`;

      const emoji = isOverdue ? "🚨" : "⏰";
      const statusLabel = isOverdue ? "บิลเกินกำหนดชำระ" : "แจ้งเตือนครบกำหนดชำระ";

      const dueStr = dueDate.toLocaleDateString("th-TH", {
        day: "numeric", month: "long", year: "numeric",
      });

      const msg = [
        `${emoji} ${statusLabel}`,
        `สวัสดีคุณ${tenantName} 🙏`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🏠 ห้อง: ${bill.room.number}  |  ประจำเดือน ${bill.month}/${yearBE}`,
        `💰 ยอดคงค้าง: ฿${(bill.totalAmount - (bill.paidAmount ?? 0)).toLocaleString()}`,
        `📅 กำหนดชำระ: ${dueStr}  (${daysText})`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `👉 ชำระได้ที่: ${appUrl}/dashboard/my-bills`,
      ].join("\n");

      let sentThisBill = false;

      // ส่ง LINE
      if (lineToken && tenant.lineUserId) {
        const result = await sendLineOAMessage(tenant.lineUserId, msg, lineToken).catch(() => null);
        if (result?.success) sentThisBill = true;
      }

      // ส่ง SMS (fallback หรือเสริม LINE)
      if (ownerId && tenant.phoneNumber) {
        const smsMsg = `[JadHor] ${isOverdue ? "บิลเกินกำหนด" : "แจ้งเตือนบิล"} ห้อง ${bill.room.number} เดือน ${bill.month}/${yearBE} ยอด ฿${(bill.totalAmount - (bill.paidAmount ?? 0)).toLocaleString()} กรุณาชำระที่ ${appUrl}/dashboard/my-bills`;
        await sendSmsWithAddon(ownerId, tenant.phoneNumber, smsMsg).catch(() => {});
        sentThisBill = true;
      }

      if (sentThisBill) {
        sent++;
        // อัปเดต status → OVERDUE ถ้าเลยกำหนดแล้ว
        if (isOverdue && bill.status === "UNPAID") {
          await prisma.bill.update({
            where: { id: bill.id },
            data: { status: "OVERDUE" },
          }).catch(() => {});
        }
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      total: unpaidBills.length,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError("bill-reminder cron ล้มเหลว", error, { route: "/api/cron/bill-reminder" });
    return NextResponse.json({ success: false, error: "Reminder failed" }, { status: 500 });
  }
}
