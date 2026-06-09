import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/tenant/vehicles/[id] — ลบยานพาหนะ */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TENANT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { userId: session.user.id } });
  if (!tenant) return NextResponse.json({ message: "Tenant not found" }, { status: 404 });

  // ตรวจว่าเป็นรถของตัวเองเท่านั้น
  const vehicle = await prisma.vehicle.findFirst({ where: { id, tenantId: tenant.id } });
  if (!vehicle) return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });

  await prisma.vehicle.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
