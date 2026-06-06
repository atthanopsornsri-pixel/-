import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
        const { email, password, name, registrationCode } = await req.json();
    const role = "OWNER";

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
    let trialEndDate = new Date();
    let planTier = "FREE_TRIAL";

    if (registrationCode) {
      validCode = await prisma.registrationCode.findUnique({
        where: { code: registrationCode }
      });

      if (!validCode || validCode.isUsed) {
        return NextResponse.json({ message: "รหัสลงทะเบียนไม่ถูกต้อง หรือถูกใช้งานไปแล้ว" }, { status: 400 });
      }
      
      // If they use a code, they get STARTER tier and the number of months specified
      planTier = "STARTER";
      trialEndDate.setMonth(trialEndDate.getMonth() + validCode.months);
    } else {
      // No code: Give them 14 days FREE_TRIAL
      trialEndDate.setDate(trialEndDate.getDate() + 14);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "OWNER", 
        pdpaAcceptedAt: new Date(),
        // 🚀 ฝังระเบิดเวลา (Trial Expiration)
        planTier: planTier as any,
        planExpiresAt: trialEndDate,
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
