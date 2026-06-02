import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name, inviteCode } = await req.json();

    if (!email || !password || !inviteCode) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
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
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
