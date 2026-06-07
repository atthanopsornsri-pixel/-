import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name, inviteCode } = await req.json();

    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องรหัสห้องพัก (Invite Code)" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องชื่อ-นามสกุลผู้เช่า" }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องอีเมล" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ message: "กรุณากรอกช่องรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" }, { status: 400 });
    }

    // Verify Invite Code
    const room = await prisma.room.findUnique({
      where: { inviteCode },
    });

    if (!room) {
      return NextResponse.json({ message: "รหัสห้องพัก (Invite Code) ไม่ถูกต้อง" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "อีเมลนี้มีผู้ใช้งานแล้ว" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and link as Tenant to the Room
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "TENANT",
        tenantProfile: {
          create: {
            roomId: room.id,
            // Lease details can be added by owner later
          }
        }
      },
    });

    // Optionally update room status to OCCUPIED if it was AVAILABLE
    if (room.status === "AVAILABLE") {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "OCCUPIED" }
      });
    }

    return NextResponse.json(
      { message: "Tenant created successfully", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    let friendlyMessage = "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง";
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      if (target.includes("email")) {
        friendlyMessage = "อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาใช้ชื่ออีเมลอื่น";
      } else {
        friendlyMessage = `ตรวจพบข้อมูลซ้ำซ้อนในระบบ (${target.join(", ")})`;
      }
    } else if (error.message?.includes("Can't reach database")) {
      friendlyMessage = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้งภายหลัง";
    }
    return NextResponse.json({ message: friendlyMessage, error: error.message }, { status: 500 });
  }
}
