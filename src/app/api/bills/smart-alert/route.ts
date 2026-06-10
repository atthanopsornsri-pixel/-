import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.id;
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { lineChannelAccessToken: true },
  });
  const accessToken = owner?.lineChannelAccessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "กรุณาตั้งค่า LINE OA Channel Access Token ก่อนใช้งาน Smart Alert" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // แจ้งเตือนบิลที่ครบกำหนดใน 3 วัน หรือเลยกำหนดแล้ว
  const alertThreshold = new Date(today);
  alertThreshold.setDate(alertThreshold.getDate() + 3);

  const bills = await prisma.bill.findMany({
    where: {
      status: { in: ["UNPAID", "OVERDUE"] },
      dueDate: { lte: alertThreshold },
      isDeleted: false,
      room: {
        isDeleted: false,
        property: { ownerId, isDeleted: false },
        tenants: { some: { lineUserId: { not: null }, isDeleted: false } },
      },
    },
    include: {
      room: {
        include: {
          tenants: {
            where: { lineUserId: { not: null }, isDeleted: false },
            take: 1,
          },
          property: { select: { name: true } },
        },
      },
    },
  });

  if (bills.length === 0) {
    return NextResponse.json({ success: true, sent: 0, total: 0, message: "ไม่มีบิลที่ต้องแจ้งเตือน" });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://jadhor.vercel.app";

  const results = await Promise.allSettled(
    bills.map(async (bill) => {
      const lineUserId = bill.room.tenants[0]?.lineUserId;
      if (!lineUserId) return { ok: false };

      const dueDate = new Date(bill.dueDate);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysLeft < 0;

      const dueDateLabel = dueDate.toLocaleDateString("th-TH", {
        day: "numeric", month: "short", year: "numeric",
      });

      const message = isOverdue
        ? `⚠️ แจ้งเตือนด่วน: บิลค้างชำระ!\n\n🏠 หอพัก: ${bill.room.property.name}\n🚪 ห้อง: ${bill.room.number}\n📅 รอบ: ${bill.month}/${bill.year + 543}\n💰 ยอด: ฿${bill.totalAmount.toLocaleString()}\n📌 ครบกำหนด: ${dueDateLabel} (เกิน ${Math.abs(daysLeft)} วัน)\n\nกรุณาชำระโดยด่วนที่:\n${baseUrl}/pay/${bill.id}`
        : `🔔 แจ้งเตือน: บิลใกล้ครบกำหนด\n\n🏠 หอพัก: ${bill.room.property.name}\n🚪 ห้อง: ${bill.room.number}\n📅 รอบ: ${bill.month}/${bill.year + 543}\n💰 ยอด: ฿${bill.totalAmount.toLocaleString()}\n📌 ครบกำหนด: ${dueDateLabel} (อีก ${daysLeft} วัน)\n\nชำระออนไลน์ได้ที่:\n${baseUrl}/pay/${bill.id}`;

      const res = await sendLineOAMessage(lineUserId, message, accessToken);
      return { ok: res.success };
    })
  );

  const sent = results.filter(r => r.status === "fulfilled" && (r as any).value.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: bills.length,
    message: failed === 0
      ? `ส่งแจ้งเตือนสำเร็จทั้งหมด ${sent} ห้อง`
      : `ส่งสำเร็จ ${sent} ห้อง · ล้มเหลว ${failed} ห้อง`,
  });
}

// GET: ดูว่ามีบิลที่ต้องแจ้งเตือนกี่ใบ
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alertThreshold = new Date(today);
  alertThreshold.setDate(alertThreshold.getDate() + 3);

  const count = await prisma.bill.count({
    where: {
      status: { in: ["UNPAID", "OVERDUE"] },
      dueDate: { lte: alertThreshold },
      isDeleted: false,
      room: {
        isDeleted: false,
        property: { ownerId: session.user.id, isDeleted: false },
        tenants: { some: { lineUserId: { not: null }, isDeleted: false } },
      },
    },
  });

  return NextResponse.json({ count });
}
