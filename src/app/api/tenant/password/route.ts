import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** GET /api/tenant/password — เช็คว่าตั้งรหัสผ่านไว้แล้วหรือยัง + เบอร์โทรปัจจุบัน */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, username: true },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    select: { phoneNumber: true },
  });

  return NextResponse.json({
    hasPassword: !!user?.password,
    username: user?.username || null,
    phoneNumber: tenant?.phoneNumber || null,
  });
}

/** PUT /api/tenant/password — ตั้ง/เปลี่ยนรหัสผ่าน (ใช้เบอร์โทรเป็น username) */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword, phoneNumber } = body;

  // validate new password
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    select: { phoneNumber: true },
  });

  // ── ถ้ามีรหัสผ่านอยู่แล้ว → ต้องยืนยันรหัสเดิมก่อน ──
  if (user?.password) {
    if (!currentPassword) {
      return NextResponse.json({ message: "กรุณากรอกรหัสผ่านเดิม" }, { status: 400 });
    }
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return NextResponse.json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 });
    }
  }

  // ── หาเบอร์โทรที่จะใช้เป็น username ──
  const cleanPhone = (phoneNumber || tenant?.phoneNumber || "").replace(/[-\s]/g, "").trim();
  if (!cleanPhone || !/^0\d{8,9}$/.test(cleanPhone)) {
    return NextResponse.json(
      { message: "ต้องมีเบอร์โทรที่ถูกต้อง เพื่อใช้เป็นชื่อผู้ใช้ในการล็อกอิน" },
      { status: 400 }
    );
  }

  // กันเบอร์ซ้ำกับ username ของคนอื่น
  const phoneTaken = await prisma.user.findFirst({
    where: { username: cleanPhone, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (phoneTaken) {
    return NextResponse.json(
      { message: "เบอร์โทรนี้ถูกใช้เป็นชื่อผู้ใช้แล้ว กรุณาใช้เบอร์อื่น" },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { username: cleanPhone, password: hashed },
      }),
      prisma.tenant.update({
        where: { userId: session.user.id },
        data: { phoneNumber: cleanPhone },
      }),
    ]);

    return NextResponse.json({ success: true, username: cleanPhone });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { message: "เบอร์โทรนี้ถูกใช้ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง" },
        { status: 409 }
      );
    }
    console.error("[TENANT_PASSWORD_PUT]", e);
    return NextResponse.json({ message: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
