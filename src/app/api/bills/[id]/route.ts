import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { canAccessProperty } from "@/lib/staff-auth";

/**
 * PATCH /api/bills/[id] — แก้ไขบิล (เฉพาะ OWNER, บิลที่ยังไม่ชำระ)
 * รองรับทั้งบิลรายเดือน (MONTHLY) และบิลเข้าอยู่ (CHECKIN)
 * คำนวณยอดรวมใหม่บน server เสมอ เพื่อกันการแก้ไขผ่าน DevTools
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const secureDb = await getSecurePrisma();

    // ตรวจสอบสิทธิ์ความเป็นเจ้าของบิล + ดึง rate ของหอ
    const bill = await secureDb.bill.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });

    if (!bill || !(await canAccessProperty(session.user.role, session.user.id, bill.room.property.ownerId, bill.room.propertyId))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    if (bill.isDeleted) {
      return NextResponse.json({ message: "บิลนี้ถูกลบไปแล้ว" }, { status: 400 });
    }

    // บิลที่ชำระแล้วห้ามแก้ — ป้องกันการแก้ยอดหลังรับเงินจริง
    if (bill.status === "PAID") {
      return NextResponse.json(
        { message: "บิลที่ชำระแล้วไม่สามารถแก้ไขได้ — หากต้องการแก้ กรุณายกเลิกการอนุมัติก่อน" },
        { status: 400 }
      );
    }

    const property = bill.room.property;

    if (bill.type === "CHECKIN") {
      // ── บิลเข้าอยู่: แก้ไขเงินประกัน / ค่าเช่าล่วงหน้า / มัดจำกุญแจ / ค่ารถ ──
      const securityDeposit = num(body.securityDeposit, bill.securityDeposit);
      const advanceRent = num(body.advanceRent, bill.advanceRent);
      const keyDeposit = num(body.keyDeposit, bill.keyDeposit);
      const vehicleFee = num(body.vehicleFee, bill.vehicleFee);

      if (securityDeposit < 0 || advanceRent < 0 || keyDeposit < 0 || vehicleFee < 0) {
        return NextResponse.json({ message: "จำนวนเงินห้ามติดลบ" }, { status: 400 });
      }

      const totalAmount = securityDeposit + advanceRent + keyDeposit + vehicleFee;
      if (totalAmount <= 0) {
        return NextResponse.json({ message: "ยอดรวมบิลเข้าอยู่ต้องมากกว่า 0" }, { status: 400 });
      }

      const updated = await prisma.bill.update({
        where: { id },
        data: {
          securityDeposit,
          advanceRent,
          keyDeposit,
          vehicleFee,
          totalAmount,
          ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
        },
      });
      return NextResponse.json(updated);
    }

    // ── บิลรายเดือน: แก้ไขค่าเช่า / น้ำ / ไฟ / ค่าบริการอื่น ──
    const rentAmount = num(body.rentAmount, bill.rentAmount);
    const waterUnits = body.waterUnits != null && body.waterUnits !== "" ? Number(body.waterUnits) : bill.waterUnits;
    const electricUnits =
      body.electricUnits != null && body.electricUnits !== "" ? Number(body.electricUnits) : bill.electricUnits;
    const commonFee = num(body.commonFee, bill.commonFee);
    const parkingFee = num(body.parkingFee, bill.parkingFee);
    const internetFee = num(body.internetFee, bill.internetFee);
    const otherFee = num(body.otherFee, bill.otherFee);

    // คำนวณค่าน้ำ/ไฟใหม่จาก units × rate เสมอ (ถ้ามี units + rate), ไม่งั้นรับ amount จาก client
    const waterAmount =
      waterUnits != null && property.waterRate != null
        ? Math.round(waterUnits * property.waterRate * 100) / 100
        : num(body.waterAmount, bill.waterAmount);
    const electricAmount =
      electricUnits != null && property.electricRate != null
        ? Math.round(electricUnits * property.electricRate * 100) / 100
        : num(body.electricAmount, bill.electricAmount);

    if (
      rentAmount < 0 ||
      waterAmount < 0 ||
      electricAmount < 0 ||
      (waterUnits != null && waterUnits < 0) ||
      (electricUnits != null && electricUnits < 0) ||
      commonFee < 0 ||
      parkingFee < 0 ||
      internetFee < 0 ||
      otherFee < 0
    ) {
      return NextResponse.json({ message: "ข้อมูลการเงินหรือค่าหน่วยมิเตอร์ห้ามมีค่าติดลบ" }, { status: 400 });
    }

    const totalAmount =
      rentAmount + waterAmount + electricAmount + commonFee + parkingFee + internetFee + otherFee;

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        rentAmount,
        waterUnits,
        waterAmount,
        electricUnits,
        electricAmount,
        commonFee,
        parkingFee,
        internetFee,
        otherFee,
        totalAmount,
        ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating bill:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/bills/[id] — ลบบิล (soft delete, เฉพาะ OWNER)
 * บิลที่ชำระแล้วลบไม่ได้ เพื่อรักษาประวัติการเงิน
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const secureDb = await getSecurePrisma();

    const bill = await secureDb.bill.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });

    if (!bill || !(await canAccessProperty(session.user.role, session.user.id, bill.room.property.ownerId, bill.room.propertyId))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    if (bill.status === "PAID") {
      return NextResponse.json(
        { message: "บิลที่ชำระแล้วไม่สามารถลบได้ — เพื่อรักษาประวัติการเงิน" },
        { status: 400 }
      );
    }

    await prisma.bill.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bill:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/** แปลงค่าเป็นตัวเลข ถ้าไม่ส่งมา (undefined/null/"") ใช้ค่าเดิม */
function num(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}
