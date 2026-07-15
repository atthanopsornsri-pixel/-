import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProperty } from "@/lib/staff-auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { number: true, rentPrice: true, propertyId: true, property: { select: { name: true, address: true, leaseTemplate: true, ownerId: true } } } },
      },
    });

    if (!tenant?.room || !(await canAccessProperty(session.user.role, session.user.id, tenant.room.property.ownerId, tenant.room.propertyId))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { firstName, lastName, idCardNumber, leaseStart, depositAmount } = body;

    // Verify ownership
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        room: {
          include: { property: true }
        }
      }
    });

    if (!tenant?.room || !(await canAccessProperty(session.user.role, session.user.id, tenant.room.property.ownerId, tenant.room.propertyId))) {
      return NextResponse.json({ message: "Unauthorized or not found" }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (idCardNumber !== undefined) updateData.idCardNumber = idCardNumber ? idCardNumber.replace(/[-\s]/g, "") : null;
    if (leaseStart !== undefined) updateData.leaseStart = leaseStart ? new Date(leaseStart) : null;
    if (depositAmount !== undefined) updateData.depositAmount = depositAmount !== null ? Number(depositAmount) : null;

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    // Also update user's name if first/last name changed
    if (firstName || lastName) {
      const fName = firstName !== undefined ? firstName : (tenant.firstName || "");
      const lName = lastName !== undefined ? lastName : (tenant.lastName || "");
      const fullName = `${fName} ${lName}`.trim();
      if (fullName) {
        await prisma.user.update({
          where: { id: tenant.userId },
          data: { name: fullName },
        });
      }
    }

    return NextResponse.json(updatedTenant);
  } catch (error) {
    console.error("Error updating tenant lease details:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

