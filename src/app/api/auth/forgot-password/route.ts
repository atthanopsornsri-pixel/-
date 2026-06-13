import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendLineOAMessage } from "@/lib/line";
import { sendEmail, resetPasswordEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * รับอีเมล → สร้าง token รีเซ็ต → ส่งลิงก์ทาง LINE (ถ้าผูกไว้) และอีเมล (ถ้าตั้งค่า Resend)
 *
 * หลักความปลอดภัย:
 *  - ตอบ success เสมอ ไม่บอกว่าอีเมลมีอยู่จริงหรือไม่ (กัน account enumeration)
 *  - เก็บเฉพาะ sha256(token) ใน DB ไม่เก็บ token ดิบ
 *  - token หมดอายุใน 1 ชั่วโมง
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`forgot-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "มีการขอรีเซ็ตบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    // ข้อความตอบกลับมาตรฐาน — ตอบเหมือนกันทุกกรณีเพื่อไม่ให้เดาได้ว่าอีเมลมีในระบบไหม
    const genericOk = NextResponse.json({
      message: "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจสอบ LINE หรืออีเมลของคุณ",
    });

    if (!email || !email.includes("@")) {
      return genericOk;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        password: true,
        lineUserId: true,
        lineChannelAccessToken: true,
      },
    });

    // ไม่มี user หรือเป็นบัญชี LINE-only (ไม่มีรหัสผ่าน) → ตอบ generic เหมือนเดิม
    if (!user || !user.password) {
      return genericOk;
    }

    // สร้าง token ดิบ + เก็บเฉพาะ hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
    });

    const appUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://jadhor.vercel.app";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // ส่งหลัง response กลับแล้ว (Vercel-safe)
    const lineUserId = user.lineUserId;
    const lineToken = user.lineChannelAccessToken;
    const userName = user.name;
    after(async () => {
      // 1) ทาง LINE (ถ้าผูกบัญชีไว้ และมี OA token)
      if (lineUserId && lineToken) {
        const lineMsg = [
          `🔑 คำขอตั้งรหัสผ่านใหม่ — JadHor OS`,
          `━━━━━━━━━━━━━━`,
          `กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่`,
          `(ลิงก์มีอายุ 1 ชั่วโมง)`,
          ``,
          resetUrl,
          ``,
          `ถ้าคุณไม่ได้เป็นคนขอ เพิกเฉยข้อความนี้ได้เลย`,
        ].join("\n");
        await sendLineOAMessage(lineUserId, lineMsg, lineToken).catch((err) =>
          console.error("[LINE] reset link error:", err)
        );
      }

      // 2) ทางอีเมล (ถ้าตั้งค่า Resend ไว้)
      await sendEmail({
        to: email,
        subject: "ตั้งรหัสผ่านใหม่ — JadHor OS",
        html: resetPasswordEmailHtml(resetUrl, userName),
      }).catch((err) => console.error("[Email] reset link error:", err));
    });

    return genericOk;
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error);
    // ตอบ generic แม้เกิด error ภายใน เพื่อไม่ให้รั่วข้อมูล
    return NextResponse.json({
      message: "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจสอบ LINE หรืออีเมลของคุณ",
    });
  }
}
