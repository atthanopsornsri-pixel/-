import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/tenant/vehicles — ดูรายการยานพาหนะของตัวเอง */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { orderBy: { createdAt: "desc" } } },
  });
  if (!tenant) return NextResponse.json({ message: "Tenant not found" }, { status: 404 });

  return NextResponse.json(tenant.vehicles);
}

/** POST /api/tenant/vehicles — เพิ่มยานพาหนะ */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { licensePlate, brand, color, type } = await req.json();

  if (!licensePlate?.trim()) {
    return NextResponse.json({ message: "กรุณากรอกทะเบียนรถ" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { userId: session.user.id } });
  if (!tenant) return NextResponse.json({ message: "Tenant not found" }, { status: 404 });

  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId:     tenant.id,
      licensePlate: licensePlate.trim().toUpperCase(),
      brand:        brand?.trim() || null,
      color:        color?.trim() || null,
      type:         type || "MOTORCYCLE",
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
