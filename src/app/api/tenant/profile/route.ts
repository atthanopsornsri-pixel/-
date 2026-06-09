import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** GET /api/tenant/profile — ดึงข้อมูลโปรไฟล์ผู้เช่า */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: true },
  });

  if (!tenant) {
    return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

/** PUT /api/tenant/profile — บันทึกข้อมูลส่วนตัว */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    firstName,
    lastName,
    idCardNumber,
    phoneNumber,
    address,
    emergencyContact,
    emergencyPhone,
    password,
  } = body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ message: "กรุณากรอกชื่อและนามสกุล" }, { status: 400 });
  }

  // validate ID card (13 digits) if provided
  if (idCardNumber && !/^\d{13}$/.test(idCardNumber.replace(/[-\s]/g, ""))) {
    return NextResponse.json({ message: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" }, { status: 400 });
  }

  const cleanPhone = phoneNumber?.replace(/[-\s]/g, "").trim() || null;

  // ── ตั้งรหัสผ่าน (optional): ใช้เบอร์โทรเป็น username ล็อกอินทุกเครื่องได้ ──
  let userPasswordUpdate: { username?: string; password?: string } = {};
  if (password) {
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }
    if (!cleanPhone || !/^0\d{8,9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { message: "ต้องกรอกเบอร์โทรให้ถูกต้อง เพื่อใช้เป็นชื่อผู้ใช้สำหรับล็อกอิน" },
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

    userPasswordUpdate = {
      username: cleanPhone,
      password: await bcrypt.hash(password, 10),
    };
  }

  // update User.name ด้วย เพื่อให้ header แสดงชื่อถูก
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  try {
    const [tenant] = await prisma.$transaction([
      prisma.tenant.update({
        where: { userId: session.user.id },
        data: {
          firstName:        firstName.trim(),
          lastName:         lastName.trim(),
          idCardNumber:     idCardNumber?.replace(/[-\s]/g, "") || null,
          phoneNumber:      cleanPhone,
          address:          address?.trim() || null,
          emergencyContact: emergencyContact?.trim() || null,
          emergencyPhone:   emergencyPhone?.trim() || null,
          profileCompleted: true,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { name: fullName, ...userPasswordUpdate },
      }),
    ]);

    return NextResponse.json({ success: true, tenant, passwordSet: !!password });
  } catch (e: any) {
    // P2002 = unique constraint (เบอร์โทรซ้ำใน Tenant.phoneNumber หรือ username)
    if (e?.code === "P2002") {
      return NextResponse.json(
        { message: "เบอร์โทรนี้ถูกใช้ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง" },
        { status: 409 }
      );
    }
    console.error("[TENANT_PROFILE_PUT]", e);
    return NextResponse.json({ message: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
