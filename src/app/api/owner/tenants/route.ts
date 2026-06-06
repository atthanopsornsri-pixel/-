import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecurePrisma } from "@/lib/prisma-secure";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, email, username, password, roomId, leaseStart, leaseEnd } = await req.json();

    if (!username || !password || !roomId) {
      return NextResponse.json({ message: "ข้อมูลไม่ครบถ้วน (ต้องมี Username, Password, Room)" }, { status: 400 });
    }

    const secureDb = await getSecurePrisma();

    // Verify room belongs to this owner using secureDb
    const room = await secureDb.room.findFirst({
      where: {
        id: roomId,
      }
    });

    if (!room) {
      return NextResponse.json({ message: "ไม่พบห้องพัก หรือคุณไม่มีสิทธิ์" }, { status: 403 });
    }

    // Check if username/email already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ message: "รหัสลูกบ้าน/Username นี้มีคนใช้แล้ว" }, { status: 400 });
    }

    const emailToUse = email || `${username.toLowerCase()}@tenant.local`;
    const existingEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
    if (existingEmail) {
      return NextResponse.json({ message: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User (Tenant Role)
    const newUser = await prisma.user.create({
      data: {
        name: name || `ผู้เช่าห้อง ${room.number}`,
        email: emailToUse,
        username,
        password: hashedPassword,
        role: "TENANT",
      }
    });

    // Create Tenant Profile
    const newTenant = await prisma.tenant.create({
      data: {
        userId: newUser.id,
        roomId: room.id,
        leaseStart: leaseStart ? new Date(leaseStart) : new Date(),
        leaseEnd: leaseEnd ? new Date(leaseEnd) : undefined,
      }
    });

    // Update Room Status
    await prisma.room.update({
      where: { id: room.id },
      data: { status: "OCCUPIED" }
    });

    return NextResponse.json({ message: "สร้างบัญชีลูกบ้านสำเร็จ", tenant: newTenant }, { status: 201 });
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
