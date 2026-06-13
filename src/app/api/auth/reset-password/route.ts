import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * รับ { token, password } → ตรวจ token (เทียบ hash + ยังไม่หมดอายุ) → ตั้งรหัสผ่านใหม่
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`reset-pw:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token) {
      return NextResponse.json({ message: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiry: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "ลิงก์รีเซ็ตหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // ตั้งรหัสผ่านใหม่ + ล้าง token ทันที (ใช้ได้ครั้งเดียว)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetTokenHash: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบด้วยรหัสใหม่ได้เลย" });
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
