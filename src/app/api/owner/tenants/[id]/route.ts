import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = params.id;
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant ID required" }, { status: 400 });
    }

    // Find the tenant and the associated room
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { room: true },
    });

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.roomId || !tenant.userId) {
      return NextResponse.json({ message: "Invalid tenant data" }, { status: 400 });
    }

    // Use a transaction to mark the room as available and delete the tenant record
    await prisma.$transaction([
      prisma.room.update({
        where: { id: tenant.roomId },
        data: { status: "AVAILABLE" }
      }),
      prisma.tenant.delete({
        where: { id: tenantId }
      }),
      prisma.user.delete({
        where: { id: tenant.userId }
      })
    ]);

    return NextResponse.json({ message: "Tenant evicted successfully" });
  } catch (error: any) {
    console.error("Failed to evict tenant:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
