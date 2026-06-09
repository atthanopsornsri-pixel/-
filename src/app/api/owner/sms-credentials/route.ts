import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendThaibulkSms, normalizeThaiPhone } from "@/lib/sms";

export const dynamic = "force-dynamic";

// GET: ดึง credentials (masked)
export async function GET() {
  try {
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
        thaibulkApiKey: true,
        thaibulkSenderId: true,
      },
    });

    if (!addon) return NextResponse.json(null);

    const key = addon.thaibulkApiKey;
    return NextResponse.json({
      ...addon,
      hasApiKey: !!key,
      thaibulkApiKey: key && key.length > 8
        ? key.slice(0, 4) + "****" + key.slice(-4)
        : key ? "****" : null,
    });
  } catch (error) {
    console.error("SMS credentials GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT: บันทึก/อัปเดต API Key (ไม่ต้องการ secret)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, senderId } = await req.json();

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { message: "กรุณาระบุ API Key" },
        { status: 400 }
      );
    }

    if (senderId && senderId.length > 11) {
      return NextResponse.json(
        { message: "Sender ID ต้องไม่เกิน 11 ตัวอักษร" },
        { status: 400 }
      );
    }

    const now = new Date();
    const addon = await prisma.smsAddon.upsert({
      where: { ownerId: session.user.id },
      update: {
        thaibulkApiKey: apiKey.trim(),
        thaibulkSenderId: (senderId?.trim() || "JadHor").slice(0, 11),
      },
      create: {
        ownerId: session.user.id,
        tier: "SIZE_S",
        quota: 50,
        used: 0,
        resetMonth: now.getMonth() + 1,
        resetYear: now.getFullYear(),
        isActive: false,
        thaibulkApiKey: apiKey.trim(),
        thaibulkSenderId: (senderId?.trim() || "JadHor").slice(0, 11),
      },
    });

    return NextResponse.json({ success: true, senderId: addon.thaibulkSenderId });
  } catch (error) {
    console.error("SMS credentials PUT error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: ทดสอบส่ง SMS
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { testPhone } = await req.json();

    if (!testPhone) {
      return NextResponse.json({ message: "กรุณาระบุเบอร์โทรทดสอบ" }, { status: 400 });
    }

    // ดึง API Key จาก DB
    const addon = await prisma.smsAddon.findUnique({
      where: { ownerId: session.user.id },
      select: { thaibulkApiKey: true, thaibulkSenderId: true },
    });

    if (!addon?.thaibulkApiKey) {
      return NextResponse.json(
        { message: "ยังไม่ได้บันทึก API Key กรุณาบันทึกก่อนทดสอบ" },
        { status: 400 }
      );
    }

    const normalized = normalizeThaiPhone(testPhone);
    if (!normalized) {
      return NextResponse.json(
        { message: `เบอร์โทร "${testPhone}" ไม่ถูกต้อง (ตัวอย่าง: 0812345678)` },
        { status: 400 }
      );
    }

    const result = await sendThaibulkSms(
      normalized,
      "[JadHor] ทดสอบระบบ SMS สำเร็จ! ขอบคุณที่ใช้บริการ JadHor OS",
      addon.thaibulkApiKey,
      "",
      addon.thaibulkSenderId ?? "JadHor"
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `ส่ง SMS ทดสอบไปยัง ${testPhone} สำเร็จ`,
      });
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
