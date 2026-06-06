import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = id;
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant ID required" }, { status: 400 });
    }

    // Find the tenant and verify ownership of the room property
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        room: {
          include: { property: true }
        } 
      },
    });

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.room || tenant.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized: You do not own this tenant's property" }, { status: 403 });
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = id;
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant ID required" }, { status: 400 });
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 });
    }

    // Find the tenant and verify ownership of the room property
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        room: {
          include: { property: true }
        } 
      },
    });

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.room || tenant.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized: You do not own this tenant's property" }, { status: 403 });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: tenant.userId },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ message: "รีเซ็ตรหัสผ่านลูกบ้านสำเร็จ" });
  } catch (error: any) {
    console.error("Failed to reset tenant password:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
