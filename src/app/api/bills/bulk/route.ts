import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { sendLineOAMessage } from "@/lib/line";
import { sendSmsWithAddon } from "@/lib/sms";
import { createDbNotification } from "@/app/actions/notifications";
import { canAccessProperty } from "@/lib/staff-auth";

/**
 * POST /api/bills/bulk
 * ออกบิลรายเดือนพร้อมกันทุกห้องที่มีผู้เช่าอยู่ในหอพักที่เลือก
 * เฉพาะ OWNER เท่านั้น — บิลที่มีอยู่แล้วสำหรับเดือนนั้นจะข้ามไป (ไม่ duplicate)
 *
 * body: { propertyId, month, year, dueDate, commonFee?, parkingFee?, internetFee? }
 *
 * Response: { created, skipped, errors, bills[] }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, month, year, dueDate, commonFee, parkingFee, internetFee } = body;

    if (!propertyId || !month || !year || !dueDate) {
      return NextResponse.json({ message: "กรุณาระบุ propertyId, month, year, dueDate" }, { status: 400 });
    }

    const secureDb = await getSecurePrisma();

    // ตรวจว่าหอนี้เป็นของ owner จริง
    const property = await secureDb.property.findUnique({
      where: { id: propertyId },
      include: { owner: true },
    });

    if (!property || !(await canAccessProperty(session.user.role, session.user.id, property.ownerId, propertyId))) {
      return NextResponse.json({ message: "ไม่พบหอพักหรือไม่มีสิทธิ์" }, { status: 403 });
    }

    // ดึงห้องที่มีผู้เช่าอยู่ (OCCUPIED) ทั้งหมด
    const occupiedRooms = await secureDb.room.findMany({
      where: {
        propertyId,
        status: "OCCUPIED",
        isDeleted: false,
      },
      include: {
        tenants: {
          where: { isDeleted: false },
          select: {
            id: true,
            lineUserId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            userId: true,
          },
          take: 1,
        },
      },
    });

    if (occupiedRooms.length === 0) {
      return NextResponse.json({ message: "ไม่พบห้องที่มีผู้เช่าอยู่ในหอนี้", created: 0, skipped: 0 }, { status: 200 });
    }

    // ดึงบิลที่มีอยู่แล้วสำหรับเดือน/ปีนี้ เพื่อ skip
    const existingBills = await secureDb.bill.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        room: { propertyId },
        isDeleted: false,
      },
      select: { roomId: true },
    });
    const existingRoomIds = new Set(existingBills.map((b) => b.roomId));

    const results: { created: any[]; skipped: string[]; errors: string[] } = {
      created: [],
      skipped: [],
      errors: [],
    };

    const appUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://jadhor.vercel.app";
    const yearBE = Number(year) + 543;
    const dueStr = new Date(dueDate).toLocaleDateString("th-TH", {
      day: "numeric", month: "long", year: "numeric",
    });

    for (const room of occupiedRooms) {
      // ข้ามห้องที่มีบิลเดือนนี้แล้ว
      if (existingRoomIds.has(room.id)) {
        results.skipped.push(room.number);
        continue;
      }

      try {
        const rentAmount = Number(room.rentPrice) || 0;
        const cf = Number(commonFee ?? property.defaultCommonFee ?? 0);
        const pf = Number(parkingFee ?? property.defaultParkingFee ?? 0);
        const inf = Number(internetFee ?? property.defaultInternetFee ?? 0);
        const totalAmount = rentAmount + cf + pf + inf;

        const bill = await prisma.bill.create({
          data: {
            month: Number(month),
            year: Number(year),
            roomId: room.id,
            tenantId: room.tenants[0]?.id ?? null,
            rentAmount,
            waterAmount: 0,
            electricAmount: 0,
            commonFee: cf,
            parkingFee: pf,
            internetFee: inf,
            otherFee: 0,
            totalAmount,
            dueDate: new Date(dueDate),
          },
          include: { room: { select: { number: true } } },
        });

        results.created.push(bill);

        // แจ้ง LINE + SMS (fire-and-forget)
        const tenant = room.tenants[0];
        if (tenant) {
          if (tenant.userId) {
            after(() =>
              createDbNotification(
                tenant.userId,
                "มีใบแจ้งหนี้รอบใหม่",
                `บิลประจำเดือน ${month}/${yearBE} ห้อง ${room.number} ยอด ฿${totalAmount.toLocaleString()} ถูกสร้างขึ้นแล้ว`,
                "BILL"
              ).catch(() => {})
            );
          }
          const tenantName =
            [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") ||
            tenant.phoneNumber ||
            "ผู้เช่า";

          if (property.owner?.lineChannelAccessToken && tenant.lineUserId) {
            const lineToken = property.owner.lineChannelAccessToken;
            const lineId = tenant.lineUserId;
            after(() =>
              sendLineOAMessage(
                lineId,
                [
                  `🧾 บิลค่าเช่าใหม่มาแล้ว!`,
                  `สวัสดีคุณ${tenantName} 🙏`,
                  `━━━━━━━━━━━━━━━━━━━━`,
                  `🏠 ห้อง: ${room.number}  |  ประจำเดือน ${month}/${yearBE}`,
                  `━━━━━━━━━━━━━━━━━━━━`,
                  `💰 ยอดชำระ: ฿${totalAmount.toLocaleString()}`,
                  `📅 กำหนดชำระ: ${dueStr}`,
                  `━━━━━━━━━━━━━━━━━━━━`,
                  `👉 ชำระได้ที่: ${appUrl}/dashboard/my-bills`,
                ].join("\n"),
                lineToken
              ).catch(() => {})
            );
          }

          if (tenant.phoneNumber) {
            const smsMsg = `[JadHor] บิลห้อง ${room.number} เดือน ${month}/${yearBE} ยอด ฿${totalAmount.toLocaleString()} กำหนดชำระ ${dueStr}`;
            after(() =>
              sendSmsWithAddon(property.ownerId, tenant.phoneNumber!, smsMsg).catch(() => {})
            );
          }
        }
      } catch (err: any) {
        // P2002 = บิลซ้ำ (race condition) — นับเป็น skip
        if (err?.code === "P2002") {
          results.skipped.push(room.number);
        } else {
          results.errors.push(room.number);
          console.error(`[Bulk Bill] ห้อง ${room.number}:`, err);
        }
      }
    }

    return NextResponse.json({
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      skippedRooms: results.skipped,
      errorRooms: results.errors,
    });
  } catch (error) {
    console.error("[Bulk Bill] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
