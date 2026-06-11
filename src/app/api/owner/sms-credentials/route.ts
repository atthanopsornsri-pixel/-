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
        thaibulkApiSecret: true,
        thaibulkSenderId: true,
      },
    });

    if (!addon) return NextResponse.json(null);

    const key = addon.thaibulkApiKey;
    const secret = addon.thaibulkApiSecret;
    const mask = (v: string | null) =>
      v && v.length > 8 ? v.slice(0, 4) + "****" + v.slice(-4) : v ? "****" : null;

    return NextResponse.json({
      ...addon,
      hasApiKey: !!key,
      hasApiSecret: !!secret,
      thaibulkApiKey: mask(key),
      thaibulkApiSecret: mask(secret),
    });
  } catch (error) {
    console.error("SMS credentials GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT: บันทึก/อัปเดต API Key + API Secret (Basic Auth ต้องใช้ทั้งคู่)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, apiSecret, senderId } = await req.json();

    // ค่า null/undefined = "คงของเดิม" (อัปเดตแค่ field อื่น)
    const isUpdatingKey = apiKey !== null && apiKey !== undefined;
    const isUpdatingSecret = apiSecret !== null && apiSecret !== undefined;

    // ถ้าส่ง key/secret มาจริงๆ → validate ไม่ให้ว่าง
    if (isUpdatingKey && !apiKey?.trim()) {
      return NextResponse.json({ message: "กรุณาระบุ API Key" }, { status: 400 });
    }
    if (isUpdatingSecret && !apiSecret?.trim()) {
      return NextResponse.json({ message: "กรุณาระบุ API Secret" }, { status: 400 });
    }

    // ป้องกัน masked value หลุดเข้ามา (defensive guard)
    if (isUpdatingKey && apiKey?.includes("****")) {
      return NextResponse.json(
        { message: "กรุณากรอก API Key ใหม่ทั้งหมด (ไม่ใช่ค่า masked)" },
        { status: 400 }
      );
    }
    if (isUpdatingSecret && apiSecret?.includes("****")) {
      return NextResponse.json(
        { message: "กรุณากรอก API Secret ใหม่ทั้งหมด (ไม่ใช่ค่า masked)" },
        { status: 400 }
      );
    }

    if (senderId && senderId.length > 11) {
      return NextResponse.json(
        { message: "Sender ID ต้องไม่เกิน 11 ตัวอักษร" },
        { status: 400 }
      );
    }

    // ตรวจว่ามี credentials ครบหรือยัง — Basic Auth ต้องมีทั้ง key และ secret
    const existing = await prisma.smsAddon.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true, thaibulkApiKey: true, thaibulkApiSecret: true },
    });
    const willHaveKey = isUpdatingKey ? true : !!existing?.thaibulkApiKey;
    const willHaveSecret = isUpdatingSecret ? true : !!existing?.thaibulkApiSecret;
    if (!willHaveKey || !willHaveSecret) {
      return NextResponse.json(
        { message: "กรุณาระบุทั้ง API Key และ API Secret ให้ครบก่อนบันทึก" },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      thaibulkSenderId: (senderId?.trim() || "JadHor").slice(0, 11),
    };
    if (isUpdatingKey) updateData.thaibulkApiKey = (apiKey as string).trim();
    if (isUpdatingSecret) updateData.thaibulkApiSecret = (apiSecret as string).trim();

    const addon = await prisma.smsAddon.upsert({
      where: { ownerId: session.user.id },
      update: updateData,
      create: {
        ownerId: session.user.id,
        tier: "SIZE_S",
        quota: 50,
        used: 0,
        resetMonth: now.getMonth() + 1,
        resetYear: now.getFullYear(),
        isActive: false,
        thaibulkApiKey: isUpdatingKey ? (apiKey as string).trim() : "",
        thaibulkApiSecret: isUpdatingSecret ? (apiSecret as string).trim() : "",
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

    // ดึง API Key + Secret จาก DB
    const addon = await prisma.smsAddon.findUnique({
      where: { ownerId: session.user.id },
      select: { thaibulkApiKey: true, thaibulkApiSecret: true, thaibulkSenderId: true },
    });

    if (!addon?.thaibulkApiKey || !addon?.thaibulkApiSecret) {
      return NextResponse.json(
        { message: "ยังไม่ได้บันทึก API Key และ API Secret ให้ครบ กรุณาบันทึกก่อนทดสอบ" },
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
      addon.thaibulkApiSecret,
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
