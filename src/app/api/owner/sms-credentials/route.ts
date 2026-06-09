import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendThaibulkSms, normalizeThaiPhone } from "@/lib/sms";

export const dynamic = "force-dynamic";

// GET: ดึง credentials (ส่งคืนแค่สถานะ — ไม่ส่ง secret กลับไป frontend)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const addon = await prisma.smsAddon.findUnique({
    where: { ownerId: session.user.id },
    select: {
      isActive: true,
      tier: true,
      quota: true,
      used: true,
      resetMonth: true,
      resetYear: true,
      thaibulkApiKey: true,     // แสดงเพื่อให้ user รู้ว่าตั้งค่าแล้วหรือยัง
      thaibulkSenderId: true,
      // ไม่ส่ง thaibulkApiSecret กลับ (masked)
    },
  });

  if (!addon) return NextResponse.json(null);

  return NextResponse.json({
    ...addon,
    hasApiKey: !!addon.thaibulkApiKey,
    thaibulkApiKey: addon.thaibulkApiKey
      ? addon.thaibulkApiKey.slice(0, 4) + "****" + addon.thaibulkApiKey.slice(-4)
      : null,
    // อย่าส่ง secret กลับเลย
  });
}

// PUT: บันทึก/อัปเดต Thaibulksms credentials
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, apiSecret, senderId } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { message: "กรุณาระบุ API Key และ API Secret" },
        { status: 400 }
      );
    }

    if (senderId && senderId.length > 11) {
      return NextResponse.json(
        { message: "Sender ID ต้องไม่เกิน 11 ตัวอักษร" },
        { status: 400 }
      );
    }

    // upsert SmsAddon กรณียังไม่มี record
    const now = new Date();
    const addon = await prisma.smsAddon.upsert({
      where: { ownerId: session.user.id },
      update: {
        thaibulkApiKey: apiKey.trim(),
        thaibulkApiSecret: apiSecret.trim(),
        thaibulkSenderId: (senderId?.trim() || "JadHor").slice(0, 11),
      },
      create: {
        ownerId: session.user.id,
        tier: "SIZE_S",
        quota: 50,
        used: 0,
        resetMonth: now.getMonth() + 1,
        resetYear: now.getFullYear(),
        isActive: false, // ยังไม่ active จนกว่าจะสมัครแพ็กเกจ
        thaibulkApiKey: apiKey.trim(),
        thaibulkApiSecret: apiSecret.trim(),
        thaibulkSenderId: (senderId?.trim() || "JadHor").slice(0, 11),
      },
    });

    return NextResponse.json({ success: true, senderId: addon.thaibulkSenderId });
  } catch (error) {
    console.error("SMS credentials PUT error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST /api/owner/sms-credentials → ทดสอบส่ง SMS
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { testPhone, apiKey, apiSecret, senderId } = await req.json();

    if (!testPhone) {
      return NextResponse.json({ message: "กรุณาระบุเบอร์โทรทดสอบ" }, { status: 400 });
    }

    // ใช้ credentials ที่ส่งมาใน body (ก่อน save) หรือดึงจาก DB
    let resolvedApiKey = apiKey;
    let resolvedApiSecret = apiSecret;
    let resolvedSenderId = senderId || "JadHor";

    if (!resolvedApiKey || !resolvedApiSecret) {
      const addon = await prisma.smsAddon.findUnique({
        where: { ownerId: session.user.id },
        select: { thaibulkApiKey: true, thaibulkApiSecret: true, thaibulkSenderId: true },
      });
      if (!addon?.thaibulkApiKey || !addon?.thaibulkApiSecret) {
        return NextResponse.json(
          { message: "ยังไม่ได้ตั้งค่า API credentials กรุณาบันทึกก่อนทดสอบ" },
          { status: 400 }
        );
      }
      resolvedApiKey = addon.thaibulkApiKey;
      resolvedApiSecret = addon.thaibulkApiSecret;
      resolvedSenderId = addon.thaibulkSenderId || "JadHor";
    }

    const normalized = normalizeThaiPhone(testPhone);
    if (!normalized) {
      return NextResponse.json(
        { message: `เบอร์โทร "${testPhone}" ไม่ถูกต้อง` },
        { status: 400 }
      );
    }

    const result = await sendThaibulkSms(
      normalized,
      `[JadHor] ทดสอบระบบ SMS สำเร็จ! 🎉 ขอบคุณที่ใช้บริการ JadHor OS`,
      resolvedApiKey,
      resolvedApiSecret,
      resolvedSenderId
    );

    if (result.success) {
      return NextResponse.json({ success: true, message: `ส่ง SMS ทดสอบไปยัง ${testPhone} สำเร็จ` });
    } else {
      return NextResponse.json(
        { success: false, message: result.error || "ส่ง SMS ไม่สำเร็จ" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("SMS test POST error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
