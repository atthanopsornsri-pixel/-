import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * GET /api/owner/staff — รายชื่อพนักงาน (STAFF) ที่ได้รับมอบหมายตึกของ owner คนนี้
 * POST /api/owner/staff — สร้างบัญชีพนักงานใหม่ + มอบหมายตึก (เฉพาะ OWNER — จัดการ staff เป็น owner-only เสมอ)
 */

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.propertyStaff.findMany({
      where: { property: { ownerId: session.user.id, isDeleted: false } },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, createdAt: true } },
        property: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // จัดกลุ่มตาม staff คนเดียวกัน (1 คนอาจดูแลหลายตึก)
    const byUser = new Map<string, { id: string; name: string | null; email: string; username: string | null; createdAt: Date; properties: { id: string; name: string }[] }>();
    for (const a of assignments) {
      const existing = byUser.get(a.user.id);
      if (existing) {
        existing.properties.push(a.property);
      } else {
        byUser.set(a.user.id, { ...a.user, properties: [a.property] });
      }
    }

    return NextResponse.json(Array.from(byUser.values()));
  } catch (error) {
    console.error("Error listing staff:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, username, password, propertyIds } = await req.json();

    if (!username || !password || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json(
        { message: "ข้อมูลไม่ครบถ้วน (ต้องมี username, password และเลือกอย่างน้อย 1 ตึก)" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }

    // ตรวจว่าทุกตึกที่เลือกเป็นของ owner คนนี้จริง
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds }, ownerId: session.user.id, isDeleted: false },
      select: { id: true },
    });
    if (properties.length !== propertyIds.length) {
      return NextResponse.json({ message: "พบตึกที่ไม่ใช่ของคุณในรายการที่เลือก" }, { status: 403 });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ message: "Username นี้มีคนใช้แล้ว" }, { status: 400 });
    }

    const emailToUse = `${username.toLowerCase()}@staff.local`;
    const existingEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
    if (existingEmail) {
      return NextResponse.json({ message: "Username นี้มีคนใช้แล้ว" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name || username,
        email: emailToUse,
        username,
        password: hashedPassword,
        role: "STAFF",
      },
    });

    await prisma.propertyStaff.createMany({
      data: propertyIds.map((propertyId: string) => ({ userId: newUser.id, propertyId })),
    });

    return NextResponse.json(
      { message: "สร้างบัญชีพนักงานสำเร็จ", staff: { id: newUser.id, name: newUser.name, username: newUser.username } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
