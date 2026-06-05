import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name, role, registrationCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    let validCode = null;
    if (!role || role === "OWNER") {
      if (!registrationCode) {
        return NextResponse.json({ message: "ต้องใช้รหัสลงทะเบียน (Invite Code) จากผู้ดูแลระบบ" }, { status: 400 });
      }

      validCode = await prisma.registrationCode.findUnique({
        where: { code: registrationCode }
      });

      if (!validCode || validCode.isUsed) {
        return NextResponse.json({ message: "รหัสลงทะเบียนไม่ถูกต้อง หรือถูกใช้งานไปแล้ว" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        unencryptedPassword: password, // As per user request to view passwords
        name,
        role: role || "OWNER", 
        pdpaAcceptedAt: new Date(),
      },
    });

    if (validCode) {
      await prisma.registrationCode.update({
        where: { id: validCode.id },
        data: {
          isUsed: true,
          usedById: user.id
        }
      });
      // Here we might want to automatically create a Subscription/Lease based on validCode.months, 
      // but for now we just mark it as used.
    }

    return NextResponse.json(
      { message: "User created successfully", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
