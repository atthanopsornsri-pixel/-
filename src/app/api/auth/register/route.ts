import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit: 5 attempts per IP per 15 minutes
    const ip = getClientIp(req);
    const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await req.json();
    const { email: rawEmail, password, name, registrationCode } = body;
    const role = "OWNER";

    if (!rawEmail || !rawEmail.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องอีเมล" }, { status: 400 });
    }
    const email = rawEmail.trim().toLowerCase();
    if (!password || password.length < 6) {
      return NextResponse.json({ message: "กรุณากรอกช่องรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ message: "กรุณากรอกช่องชื่อ-นามสกุล (ผู้ดูแล)" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ" }, { status: 400 });
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
  } catch (error: any) {
    console.error("Registration error:", error);
    
    let friendlyMessage = "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง";
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      if (target.includes("email")) {
        friendlyMessage = "อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาใช้ชื่ออีเมลอื่น";
      } else if (target.includes("username")) {
        friendlyMessage = "ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว";
      } else {
        friendlyMessage = `ตรวจพบข้อมูลซ้ำซ้อนในระบบ (${target.join(", ")})`;
      }
    } else if (error.message?.includes("Can't reach database")) {
      friendlyMessage = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้งภายหลัง";
    }
    
    return NextResponse.json({ message: friendlyMessage }, { status: 500 });
  }
}
