import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Check-out (Final Settlement) — ดึง/บันทึกร่างบิลปิดเคสตอนผู้เช่าย้ายออก
 * OWNER เท่านั้น + ต้องเป็นเจ้าของ property ของผู้เช่ารายนี้ (กัน IDOR)
 */

// คำนวณยอดสุทธิ: + = ผู้เช่าต้องจ่ายเพิ่ม, - = เจ้าของต้องคืนเงิน
function computeNet(v: {
  finalUtilityAmount: number;
  finalRentAmount: number;
  outstandingAmount: number;
  deductionAmount: number;
  depositAmount: number;
}) {
  return (
    v.finalUtilityAmount +
    v.finalRentAmount +
    v.outstandingAmount +
    v.deductionAmount -
    v.depositAmount
  );
}

async function loadTenantForOwner(id: string, ownerId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      room: { include: { property: true } },
      checkout: true,
    },
  });
  if (!tenant || tenant.room?.property?.ownerId !== ownerId) return null;
  return tenant;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant = await loadTenantForOwner(id, session.user.id);
    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const room = tenant.room;
    const property = room?.property;

    // เลขมิเตอร์ครั้งก่อน = บิลรายเดือนล่าสุดของห้อง (fallback = เลขตั้งต้นตอนย้ายเข้า)
    const lastBill = room
      ? await prisma.bill.findFirst({
          where: { roomId: room.id, isDeleted: false, type: "MONTHLY" },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          select: { waterReading: true, electricReading: true },
        })
      : null;

    const prevWaterReading = lastBill?.waterReading ?? room?.waterMeterStart ?? 0;
    const prevElectricReading = lastBill?.electricReading ?? room?.electricMeterStart ?? 0;

    // ยอดค้างจากบิลที่ยังไม่ปิด (totalAmount - paidAmount)
    const unpaidBills = room
      ? await prisma.bill.findMany({
          where: {
            roomId: room.id,
            isDeleted: false,
            status: { in: ["UNPAID", "PARTIAL", "OVERDUE", "PENDING"] },
          },
          select: { totalAmount: true, paidAmount: true },
        })
      : [];
    const outstandingAmount = unpaidBills.reduce(
      (sum, b) => sum + (b.totalAmount - (b.paidAmount ?? 0)),
      0
    );

    const depositAmount = tenant.depositAmount ?? property?.defaultSecurityDeposit ?? room?.rentPrice ?? 0;

    return NextResponse.json({
      checkout: tenant.checkout, // ร่างที่บันทึกไว้ (ถ้ามี)
      suggested: {
        prevWaterReading,
        prevElectricReading,
        waterRate: property?.waterRate ?? 0,
        electricRate: property?.electricRate ?? 0,
        finalRentAmount: room?.rentPrice ?? 0,
        outstandingAmount,
        depositAmount,
      },
      tenant: {
        id: tenant.id,
        name: [tenant.firstName, tenant.lastName].filter(Boolean).join(" "),
        roomNumber: room?.number ?? "",
        moveOutDate: tenant.moveOutDate,
      },
    });
  } catch (error) {
    console.error("Error loading checkout:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant = await loadTenantForOwner(id, session.user.id);
    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    if (tenant.checkout?.status === "COMPLETED") {
      return NextResponse.json(
        { message: "เคสนี้ปิดเรียบร้อยแล้ว ไม่สามารถแก้ไขได้" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

    const property = tenant.room?.property;
    const waterRate = property?.waterRate ?? 0;
    const electricRate = property?.electricRate ?? 0;

    const room = tenant.room;
    const lastBill = room
      ? await prisma.bill.findFirst({
          where: { roomId: room.id, isDeleted: false, type: "MONTHLY" },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          select: { waterReading: true, electricReading: true },
        })
      : null;
    const prevWater = lastBill?.waterReading ?? room?.waterMeterStart ?? 0;
    const prevElectric = lastBill?.electricReading ?? room?.electricMeterStart ?? 0;

    // ค่าน้ำ-ไฟงวดสุดท้าย = (เลขล่าสุด - เลขก่อนหน้า) × เรต — กันติดลบ
    const waterReadingFinal = body.waterReadingFinal != null ? num(body.waterReadingFinal) : null;
    const electricReadingFinal = body.electricReadingFinal != null ? num(body.electricReadingFinal) : null;
    const waterUnits = waterReadingFinal != null ? Math.max(0, waterReadingFinal - prevWater) : 0;
    const electricUnits = electricReadingFinal != null ? Math.max(0, electricReadingFinal - prevElectric) : 0;
    const finalUtilityAmount = waterUnits * waterRate + electricUnits * electricRate;

    const finalRentAmount = num(body.finalRentAmount);
    const outstandingAmount = num(body.outstandingAmount);
    const deductionAmount = num(body.deductionAmount);
    const depositAmount = num(body.depositAmount);

    const netAmount = computeNet({
      finalUtilityAmount,
      finalRentAmount,
      outstandingAmount,
      deductionAmount,
      depositAmount,
    });

    const data = {
      waterReadingFinal,
      electricReadingFinal,
      finalUtilityAmount,
      finalRentAmount,
      outstandingAmount,
      depositAmount,
      deductionAmount,
      deductionNote: typeof body.deductionNote === "string" ? body.deductionNote : null,
      deductionPhotoUrl: typeof body.deductionPhotoUrl === "string" ? body.deductionPhotoUrl : null,
      netAmount,
      status: "DRAFT" as const,
    };

    const checkout = await prisma.checkout.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, ...data },
      update: data,
    });

    return NextResponse.json(checkout);
  } catch (error) {
    console.error("Error saving checkout:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
