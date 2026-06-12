import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit: 3 submissions per IP per 10 minutes
    const ip = getClientIp(req);
    const rl = rateLimit(`contact:${ip}`, 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.redirect(new URL("/?contact=error#contact", req.url), { status: 303 });
    }

    const formData = await req.formData();

    const name    = (formData.get("name")    as string | null)?.trim() || "";
    const phone   = (formData.get("phone")   as string | null)?.trim() || "";
    const email   = (formData.get("email")   as string | null)?.trim() || "";
    const message = (formData.get("message") as string | null)?.trim() || "";

    if (!name || !phone || !message) {
      return NextResponse.redirect(new URL("/?contact=error#contact", req.url), { status: 303 });
    }

    // Forward to admin via LINE OA (if any ADMIN has LINE OA set up)
    try {
      const admin = await prisma.user.findFirst({
        where: {
          role: "ADMIN",
          lineChannelAccessToken: { not: null },
          lineUserId: { not: null },
        },
        select: { lineChannelAccessToken: true, lineUserId: true },
      });

      if (admin?.lineChannelAccessToken && admin.lineUserId) {
        await sendLineOAMessage(
          admin.lineUserId,
          `📩 มีข้อความติดต่อจากเว็บไซต์ JadHor OS!\nชื่อ: ${name}\nเบอร์: ${phone}\nอีเมล: ${email || "-"}\nข้อความ: ${message}`,
          admin.lineChannelAccessToken
        );
      } else {
        // Fallback: log for now (can hook up email/Resend later)
        console.info(`[Contact Form] ${name} | ${phone} | ${email} | ${message}`);
      }
    } catch (notifyErr) {
      // Non-fatal — don't fail the user's request because of a notification error
      console.error("[Contact Form] Notification error:", notifyErr);
    }

    return NextResponse.redirect(new URL("/?contact=success#contact", req.url), { status: 303 });
  } catch (error) {
    console.error("[Contact Form] Unexpected error:", error);
    return NextResponse.redirect(new URL("/?contact=error#contact", req.url), { status: 303 });
  }
}
