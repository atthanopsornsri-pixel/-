import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SMS_PRICES, type SmsTierKey } from "@/lib/pricing";

// GET: Owner ดึงข้อมูล SMS Addon ของตัวเอง
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const smsAddon = await prisma.smsAddon.findUnique({
      where: { ownerId: session.user.id }
    });

    return NextResponse.json(smsAddon || null);
  } catch (error) {
    console.error("SMS Addon GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: Owner สมัคร/เปลี่ยน tier แพ็กเกจ SMS Add-on
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { tier } = await req.json();
    const tierKey = tier as SmsTierKey;

    if (!SMS_PRICES[tierKey]) {
      return NextResponse.json({ message: "แพ็กเกจ SMS ไม่ถูกต้อง" }, { status: 400 });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Upsert: สร้างใหม่หรืออัปเดต tier ที่มีอยู่
    const smsAddon = await prisma.smsAddon.upsert({
      where: { ownerId: session.user.id },
      update: {
        tier: tierKey,
        quota: SMS_PRICES[tierKey].quota,
        isActive: true,
      },
      create: {
        ownerId: session.user.id,
        tier: tierKey,
        quota: SMS_PRICES[tierKey].quota,
        used: 0,
        resetMonth: currentMonth,
        resetYear: currentYear,
        isActive: true,
      }
    });

    return NextResponse.json(smsAddon, { status: 201 });
  } catch (error) {
    console.error("SMS Addon POST error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Owner ยกเลิกแพ็กเกจ SMS Add-on
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.smsAddon.findUnique({
      where: { ownerId: session.user.id }
    });

    if (!existing) {
      return NextResponse.json({ message: "ไม่พบแพ็กเกจ SMS" }, { status: 404 });
    }

    // Soft deactivate (ไม่ลบ เผื่อกลับมาสมัครใหม่)
    const updated = await prisma.smsAddon.update({
      where: { ownerId: session.user.id },
      data: { isActive: false }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("SMS Addon DELETE error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
