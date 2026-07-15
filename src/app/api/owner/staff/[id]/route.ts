import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/owner/staff/[id] — แก้ไขรายชื่อตึกที่พนักงานคนนี้ดูแล (แทนที่ทั้งหมด)
 * DELETE /api/owner/staff/[id] — ถอนพนักงานออกจากทุกตึกของ owner คนนี้ (ลบบัญชีถ้าไม่เหลือตึกใดๆ ที่ดูแลอยู่เลย)
 *
 * เฉพาะ OWNER — จัดการ staff เป็น owner-only เสมอ (ไม่ใช่ daily-ops)
 */

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: staffUserId } = await params;
    const { propertyIds } = await req.json();

    if (!Array.isArray(propertyIds)) {
      return NextResponse.json({ message: "propertyIds ต้องเป็น array" }, { status: 400 });
    }

    const staffUser = await prisma.user.findUnique({ where: { id: staffUserId } });
    if (!staffUser || staffUser.role !== "STAFF") {
      return NextResponse.json({ message: "ไม่พบพนักงาน" }, { status: 404 });
    }

    // ตรวจว่าตึกที่ระบุทั้งหมดเป็นของ owner คนนี้จริง
    if (propertyIds.length > 0) {
      const properties = await prisma.property.findMany({
        where: { id: { in: propertyIds }, ownerId: session.user.id, isDeleted: false },
        select: { id: true },
      });
      if (properties.length !== propertyIds.length) {
        return NextResponse.json({ message: "พบตึกที่ไม่ใช่ของคุณในรายการที่เลือก" }, { status: 403 });
      }
    }

    // ลบ assignment เดิมของ owner คนนี้เท่านั้น (ไม่แตะ assignment กับ owner อื่นถ้ามี)
    await prisma.propertyStaff.deleteMany({
      where: { userId: staffUserId, property: { ownerId: session.user.id } },
    });

    if (propertyIds.length > 0) {
      await prisma.propertyStaff.createMany({
        data: propertyIds.map((propertyId: string) => ({ userId: staffUserId, propertyId })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating staff assignments:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: staffUserId } = await params;

    const staffUser = await prisma.user.findUnique({ where: { id: staffUserId } });
    if (!staffUser || staffUser.role !== "STAFF") {
      return NextResponse.json({ message: "ไม่พบพนักงาน" }, { status: 404 });
    }

    // ถอนออกจากทุกตึกของ owner คนนี้เท่านั้น
    await prisma.propertyStaff.deleteMany({
      where: { userId: staffUserId, property: { ownerId: session.user.id } },
    });

    // ถ้าไม่เหลือตึกที่ดูแลอยู่เลย (ไม่ว่าของ owner ไหน) → ลบบัญชีทิ้งไปด้วย
    const remaining = await prisma.propertyStaff.count({ where: { userId: staffUserId } });
    if (remaining === 0) {
      await prisma.user.delete({ where: { id: staffUserId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing staff:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
