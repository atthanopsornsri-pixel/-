import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  } = body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ message: "กรุณากรอกชื่อและนามสกุล" }, { status: 400 });
  }

  // validate ID card (13 digits) if provided
  if (idCardNumber && !/^\d{13}$/.test(idCardNumber.replace(/[-\s]/g, ""))) {
    return NextResponse.json({ message: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" }, { status: 400 });
  }

  // update User.name ด้วย เพื่อให้ header แสดงชื่อถูก
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  const [tenant] = await prisma.$transaction([
    prisma.tenant.update({
      where: { userId: session.user.id },
      data: {
        firstName:        firstName.trim(),
        lastName:         lastName.trim(),
        idCardNumber:     idCardNumber?.replace(/[-\s]/g, "") || null,
        phoneNumber:      phoneNumber?.trim() || null,
        address:          address?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null,
        emergencyPhone:   emergencyPhone?.trim() || null,
        profileCompleted: true,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { name: fullName },
    }),
  ]);

  return NextResponse.json({ success: true, tenant });
}
