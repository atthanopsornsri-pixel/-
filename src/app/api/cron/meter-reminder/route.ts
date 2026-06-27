import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    // 1. ดึงข้อมูลหอพักทั้งหมดที่เปิดใช้งานระบบส่งหน่วยมิเตอร์เอง
    const properties = await prisma.property.findMany({
      where: {
        enableTenantReport: true,
        isDeleted: false
      },
      include: {
        owner: {
          select: {
            lineChannelAccessToken: true
          }
        },
        rooms: {
          where: {
            status: "OCCUPIED",
            isDeleted: false
          },
          include: {
            tenants: {
              where: {
                isDeleted: false
              },
              select: {
                id: true,
                lineUserId: true
              }
            }
          }
        }
      }
    });

    let sentCount = 0;

    for (const property of properties) {
      const lineToken = property.owner?.lineChannelAccessToken;
      if (!lineToken) continue; // ข้ามหากหอพักยังไม่ได้เชื่อม LINE OA

      for (const room of property.rooms) {
        const tenant = room.tenants[0];
        if (!tenant || !tenant.lineUserId) continue; // ข้ามหากห้องนี้ไม่มีผู้เช่าหรือผู้เช่าไม่ได้ผูกไลน์

        // 2. เช็คว่าผู้เช่าเคยส่งมิเตอร์น้ำ/ไฟ ประจำเดือนนี้แล้วหรือยัง
        const submissions = await prisma.meterSubmission.findMany({
          where: {
            roomId: room.id,
            month,
            year
          },
          select: {
            type: true
          }
        });

        const hasWater = submissions.some((s) => s.type === "WATER");
        const hasElectric = submissions.some((s) => s.type === "ELECTRIC");

        // หากจดครบแล้วทั้งคู่ ไม่ต้องเตือน
        if (hasWater && hasElectric) continue;

        // 3. เตรียมข้อความแจ้งเตือนตามสิ่งที่ยังไม่ได้ส่ง
        const missingList = [];
        if (!hasWater) missingList.push("มิเตอร์น้ำ");
        if (!hasElectric) missingList.push("มิเตอร์ไฟ");

        const missingText = missingList.join(" และ ");
        const appUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://jadhor.vercel.app";
        const reportUrl = `${appUrl}/dashboard/my-meters/report`;

        const message = `🔔 แจ้งเตือนบันทึกมิเตอร์น้ำ/ไฟ ห้อง ${room.number}:\n\nถึงรอบจดบันทึกตัวเลขมิเตอร์ประจำเดือนแล้วค่ะ กรุณารายงานยอดของ ${missingText} พร้อมแนบภาพหลักฐานภายในวันที่ ${property.reportEndDay} ของเดือนนี้ด้วยนะคะ\n\n👉 กดบันทึกหน่วยได้ที่นี่: ${reportUrl}`;

        const result = await sendLineOAMessage(tenant.lineUserId, message, lineToken);
        if (result.success) {
          sentCount++;
        }
      }
    }

    return NextResponse.json({ success: true, remindersSent: sentCount });
  } catch (error: any) {
    console.error("meter-reminder cron error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
