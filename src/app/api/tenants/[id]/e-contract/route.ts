import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        user: true,
        room: {
          include: {
            property: true
          }
        }
      }
    });

    if (!tenant || tenant.room?.property?.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    // Default data structure if eContractData is null
    const defaultData = {
      landlordName: tenant.room?.property?.companyName || session.user.name || "",
      landlordIdType: "บัตรประจำตัวประชาชน",
      landlordIdNumber: "",
      landlordAddress: tenant.room?.property?.address || "",
      tenantName: tenant.firstName && tenant.lastName ? `${tenant.firstName} ${tenant.lastName}` : tenant.user?.name || "",
      tenantIdType: "บัตรประจำตัวประชาชน",
      tenantIdNumber: tenant.idCardNumber || "",
      tenantAddress: tenant.address || "",
      roomNumber: tenant.room?.number || "",
      propertyType: "ห้องพัก",
      propertyName: tenant.room?.property?.name || "",
      rentPrice: tenant.room?.rentPrice || 0,
      depositAmount: tenant.depositAmount || 0,
      leaseStart: tenant.leaseStart ? new Date(tenant.leaseStart).toISOString().split('T')[0] : "",
      leaseEnd: tenant.leaseEnd ? new Date(tenant.leaseEnd).toISOString().split('T')[0] : "",
      rentDueDate: "5"
    };

    return NextResponse.json({
      data: tenant.eContractData || defaultData,
      status: tenant.eContractStatus,
      token: tenant.eContractToken,
      property: tenant.room?.property
    });
  } catch (error) {
    console.error("Error fetching e-contract data:", error);
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
    const body = await req.json();

    const existing = await prisma.tenant.findUnique({
      where: { id },
      include: { room: { include: { property: true } } }
    });

    if (!existing || existing.room?.property?.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        eContractData: body.eContractData,
        eContractStatus: body.eContractStatus || "DRAFT"
      }
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error updating e-contract data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
