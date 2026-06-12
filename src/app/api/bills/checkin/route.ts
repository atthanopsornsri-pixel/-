import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { Prisma } from "@prisma/client";
import { sendLineOAMessage } from "@/lib/line";

/**
 * POST /api/bills/checkin — ออก "บิลเข้าอยู่" (Check-in)
 * เก็บ: เงินประกันห้อง + ค่าเช่าล่วงหน้า + ค่ามัดจำกุญแจ + ค่าลงทะเบียนรถ
 * และ sync เงินประกัน → tenant.depositAmount เพื่อใช้ในสัญญาเช่า
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      roomId,
      securityDeposit = 0,
      advanceRent = 0,
      keyDeposit = 0,
      vehicleFee = 0,
      dueDate,
      leaseStart, // optional — วันเริ่มสัญญา
    } = body;

    if (!roomId || !dueDate) {
      return NextResponse.json({ message: "กรุณาระบุห้องและวันครบกำหนดชำระ" }, { status: 400 });
    }

    const nums = { securityDeposit, advanceRent, keyDeposit, vehicleFee };
    for (const [k, v] of Object.entries(nums)) {
      if (Number(v) < 0 || Number.isNaN(Number(v))) {
        return NextResponse.json({ message: `ค่า ${k} ไม่ถูกต้อง` }, { status: 400 });
      }
    }

    const total =
      Number(securityDeposit) + Number(advanceRent) + Number(keyDeposit) + Number(vehicleFee);

    if (total <= 0) {
      return NextResponse.json({ message: "ยอดรวมบิลเข้าอยู่ต้องมากกว่า 0" }, { status: 400 });
    }

    const secureDb = await getSecurePrisma();

    // ตรวจสอบว่าห้องเป็นของ owner คนนี้
    const room = await secureDb.room.findUnique({
      where: { id: roomId },
      include: { property: { include: { owner: true } } },
    });
    if (!room) {
      return NextResponse.json({ message: "ไม่พบห้อง หรือไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    // กันออกบิลเข้าอยู่ซ้ำ (1 ห้อง = 1 บิลเข้าอยู่ ต่อรอบผู้เช่า)
    const existing = await secureDb.bill.findFirst({
      where: { roomId, type: "CHECKIN", status: { not: "PAID" } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "ห้องนี้มีบิลเข้าอยู่ที่ยังไม่ชำระอยู่แล้ว" },
        { status: 400 }
      );
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const bill = await prisma.bill.create({
      data: {
        type: "CHECKIN",
        month,
        year,
        roomId,
        rentAmount: 0,
        waterAmount: 0,
        electricAmount: 0,
        securityDeposit: Number(securityDeposit),
        advanceRent: Number(advanceRent),
        keyDeposit: Number(keyDeposit),
        vehicleFee: Number(vehicleFee),
        totalAmount: total,
        dueDate: new Date(dueDate),
      },
      include: { room: { select: { number: true } } },
    });

    // sync เงินประกัน + วันเริ่มสัญญา → Tenant (ใช้ต่อในสัญญาเช่า)
    const tenant = await secureDb.tenant.findFirst({
      where: { roomId },
      select: { id: true, lineUserId: true },
    });
    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          depositAmount: Number(securityDeposit),
          ...(leaseStart ? { leaseStart: new Date(leaseStart) } : {}),
        },
      });
    }

    // แจ้งเตือนลูกบ้านผ่าน LINE OA
    if (room.property.owner?.lineChannelAccessToken && tenant?.lineUserId) {
      const msg = [
        `🔑 บิลค่าเข้าอยู่ ห้อง ${bill.room.number}`,
        `━━━━━━━━━━━━━━`,
        Number(securityDeposit) > 0 ? `• เงินประกันห้อง: ฿${Number(securityDeposit).toLocaleString()}` : null,
        Number(advanceRent) > 0 ? `• ค่าเช่าล่วงหน้า: ฿${Number(advanceRent).toLocaleString()}` : null,
        Number(keyDeposit) > 0 ? `• ค่ามัดจำกุญแจ/คีย์การ์ด: ฿${Number(keyDeposit).toLocaleString()}` : null,
        Number(vehicleFee) > 0 ? `• ค่าลงทะเบียนรถ: ฿${Number(vehicleFee).toLocaleString()}` : null,
        `━━━━━━━━━━━━━━`,
        `💰 ยอดรวม: ฿${total.toLocaleString()}`,
        `กำหนดชำระ: ${new Date(dueDate).toLocaleDateString("th-TH")}`,
        `กรุณาชำระเงินก่อนเซ็นสัญญาเช่า`,
      ]
        .filter(Boolean)
        .join("\n");

      const tenantLineId = tenant.lineUserId;
      const lineToken = room.property.owner.lineChannelAccessToken;
      after(() =>
        sendLineOAMessage(tenantLineId, msg, lineToken).catch(
          (err) => console.error("[LINE] checkin bill notify error:", err)
        )
      );
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "มีบิลเข้าอยู่ของเดือนนี้แล้ว" }, { status: 400 });
    }
    console.error("Error creating check-in bill:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}
