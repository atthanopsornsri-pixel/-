import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { Prisma } from "@prisma/client";
import { sendLineOAMessage } from "@/lib/line";
import { sendSmsWithAddon } from "@/lib/sms";
import { detectBillAnomaly, draftBillNotification } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      roomId, month, year, rentAmount, 
      waterUnits, waterAmount, electricUnits, electricAmount, 
      commonFee, parkingFee, internetFee, otherFee, dueDate 
    } = body;

    if (!roomId || !month || !year || !dueDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (
      Number(rentAmount) < 0 ||
      Number(waterAmount) < 0 ||
      Number(electricAmount) < 0 ||
      (waterUnits !== undefined && waterUnits !== null && Number(waterUnits) < 0) ||
      (electricUnits !== undefined && electricUnits !== null && Number(electricUnits) < 0) ||
      Number(commonFee || 0) < 0 ||
      Number(parkingFee || 0) < 0 ||
      Number(internetFee || 0) < 0 ||
      Number(otherFee || 0) < 0
    ) {
      return NextResponse.json({ message: "ข้อมูลการเงินหรือค่าหน่วยมิเตอร์ห้ามมีค่าติดลบ" }, { status: 400 });
    }

    const secureDb = await getSecurePrisma();

    // Verify room belongs to this owner and fetch owner details for LINE config
    const room = await secureDb.room.findUnique({
      where: { id: roomId },
      include: {
        property: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ message: "Unauthorized room access" }, { status: 403 });
    }

    // Check if bill already exists for this room, month, year
    const existingBill = await secureDb.bill.findFirst({
      where: { roomId, month: Number(month), year: Number(year) }
    });

    if (existingBill) {
      return NextResponse.json({ message: "บิลของเดือนนี้ถูกสร้างไปแล้ว" }, { status: 400 });
    }

    // ── Bug B Fix: คำนวณ water/electric ใหม่บน server จาก units × rate ──
    // ป้องกัน Client แก้ไข amount ผ่าน DevTools ก่อน submit
    const property = room.property;
    const safeWaterUnits = waterUnits != null ? Number(waterUnits) : null;
    const safeElectricUnits = electricUnits != null ? Number(electricUnits) : null;

    // ถ้ามี units + rate → คำนวณใหม่บน server เสมอ
    // ถ้าไม่มี units (เหมาจ่าย) → รับค่าจาก client ตามเดิม
    const verifiedWaterAmount =
      safeWaterUnits != null && property.waterRate != null
        ? Math.round(safeWaterUnits * property.waterRate * 100) / 100
        : Number(waterAmount);

    const verifiedElectricAmount =
      safeElectricUnits != null && property.electricRate != null
        ? Math.round(safeElectricUnits * property.electricRate * 100) / 100
        : Number(electricAmount);

    const totalAmount =
      Number(rentAmount) +
      verifiedWaterAmount +
      verifiedElectricAmount +
      Number(commonFee || 0) +
      Number(parkingFee || 0) +
      Number(internetFee || 0) +
      Number(otherFee || 0);

    // ผู้เช่าปัจจุบันของห้อง — ผูก tenantId กับบิล (ประวัติไม่ปนกับผู้เช่าคนถัดไป)
    const activeTenant = await prisma.tenant.findFirst({
      where: { roomId, isDeleted: false },
      select: { id: true },
    });

    // secureDb doesn't filter create by default to avoid issues, we verified room ownership above.
    const bill = await prisma.bill.create({
      data: {
        month: Number(month),
        year: Number(year),
        roomId,
        tenantId: activeTenant?.id ?? null,
        rentAmount: Number(rentAmount),
        waterAmount: verifiedWaterAmount,
        waterUnits: safeWaterUnits,
        electricAmount: verifiedElectricAmount,
        electricUnits: safeElectricUnits,
        commonFee: Number(commonFee || 0),
        parkingFee: Number(parkingFee || 0),
        internetFee: Number(internetFee || 0),
        otherFee: Number(otherFee || 0),
        totalAmount,
        dueDate: new Date(dueDate),
      },
      include: {
        room: { select: { number: true } }
      }
    });

    // แจ้ง LINE + SMS ผู้เช่า (fire-and-forget)
    const tenant = await secureDb.tenant.findFirst({
      where: { roomId },
      select: { lineUserId: true, firstName: true, lastName: true, phoneNumber: true }
    });

    const tenantName =
      [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ") ||
      tenant?.phoneNumber ||
      "ผู้เช่า";
    const yearBE = Number(year) + 543;
    const appUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://jadhor.vercel.app";
    const dueStr = new Date(dueDate).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Feature #5: LINE notification — personalized via AI (with fallback template)
    if (room?.property?.owner?.lineChannelAccessToken && tenant?.lineUserId) {
      const lineToken = room.property.owner.lineChannelAccessToken;
      const tenantLineId = tenant.lineUserId;

      // ดึงประวัติชำระเงิน 3 เดือนล่าสุดสำหรับ AI personalization
      const paymentHistory = await secureDb.bill.findMany({
        where: { roomId, isDeleted: false, id: { not: bill.id } },
        select: { month: true, year: true, status: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 3,
      });

      // after() — Vercel จะรอให้งานนี้เสร็จหลังส่ง response แล้ว (IIFE เฉย ๆ โดนตัดทิ้ง)
      after(async () => {
        const aiMsg = await draftBillNotification({
          tenantName,
          roomNumber: bill.room.number,
          month: Number(month),
          year: Number(year),
          totalAmount,
          dueDate: dueStr,
          paymentHistory,
          appUrl,
        }).catch(() => null);

        const lineMsg = aiMsg || [
          `🧾 บิลค่าเช่าใหม่มาแล้ว!`,
          `สวัสดีคุณ${tenantName} 🙏`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `🏠 ห้อง: ${bill.room.number}  |  ประจำเดือน ${month}/${yearBE}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `💰 ยอดชำระ: ฿${totalAmount.toLocaleString()}`,
          `📅 กำหนดชำระ: ${dueStr}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `👉 ชำระเงินและแนบสลิปได้ที่:`,
          `${appUrl}/dashboard/my-bills`,
        ].join("\n");

        await sendLineOAMessage(tenantLineId, lineMsg, lineToken)
          .catch((err) => console.error("[LINE] bill notify error:", err));
      });
    }

    // SMS notification (ถ้า owner มี SMS addon และผู้เช่ามีเบอร์)
    if (tenant?.phoneNumber && room?.property?.ownerId) {
      const smsMsg = `[JadHor] บิลห้อง ${bill.room.number} เดือน ${month}/${yearBE} ยอด ฿${totalAmount.toLocaleString()} กำหนดชำระ ${dueStr} จ่ายได้ที่ ${appUrl}/dashboard/my-bills`;
      const smsPhone = tenant.phoneNumber;
      const smsOwnerId = room.property.ownerId;
      after(() =>
        sendSmsWithAddon(smsOwnerId, smsPhone, smsMsg)
          .catch((err) => console.error("[SMS] bill notify error:", err))
      );
    }

    // Feature #2: Anomaly detection — แจ้งเตือนเจ้าของถ้าค่าน้ำ/ไฟผิดปกติ (fire-and-forget)
    if (room?.property?.owner?.lineUserId && room?.property?.owner?.lineChannelAccessToken) {
      const ownerLineId = room.property.owner.lineUserId;
      const ownerToken = room.property.owner.lineChannelAccessToken;

      after(async () => {
        const history = await prisma.bill.findMany({
          where: { roomId, isDeleted: false, id: { not: bill.id } },
          select: { waterUnits: true, electricUnits: true, month: true, year: true },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 3,
        });

        const anomaly = await detectBillAnomaly({
          roomNumber: bill.room.number,
          propertyName: room.property.name || "หอพัก",
          newBill: { waterUnits: safeWaterUnits, electricUnits: safeElectricUnits, month: Number(month), year: Number(year) },
          history,
        }).catch(() => null);

        if (anomaly?.isAnomaly) {
          const alertMsg = [
            `🚨 Smart Alert: ค่าสาธารณูปโภคผิดปกติ`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `🏠 ห้อง ${bill.room.number}  |  เดือน ${month}/${yearBE}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            anomaly.alertMessage,
            `━━━━━━━━━━━━━━━━━━━━`,
            `👉 ตรวจสอบเพิ่มเติมในระบบจัดการบิล`,
          ].join("\n");

          await sendLineOAMessage(ownerLineId, alertMsg, ownerToken)
            .catch((err) => console.error("[LINE] anomaly alert error:", err));
        }
      });
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: "A bill for this room in this specific month/year already exists (Double-Billing Prevented)." }, 
          { status: 400 }
        );
      }
    }
    
    console.error("Error creating bill:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    let whereClause: any = { isDeleted: false };
    if (propertyId && (session.user.role === "OWNER" || session.user.role === "STAFF")) {
      whereClause = { isDeleted: false, room: { propertyId } };
    }

    const secureDb = await getSecurePrisma();
    
    // getSecurePrisma automatically isolates OWNERs and TENANTs correctly!
    const bills = await secureDb.bill.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            number: true,
            property: { select: { name: true, promptPayNo: true, promptPayName: true } },
            tenants: {
              where: { isDeleted: false },
              select: { lineUserId: true }
            }
          }
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
    });

    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
