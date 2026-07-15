import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // 1. Generate unique token
    const token = crypto.randomBytes(32).toString("hex");

    // 2. Update tenant with token and status, and save landlord signature to property or tenant
    // Since signatureUrl in Tenant is usually for the tenant's signature or final PDF,
    // we can store the landlord signature in eContractData or a separate field.
    // For now, let's put landlordSignature inside eContractData so it's kept with the draft.
    
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { room: { include: { property: true } } }
    });
    if (!tenant || tenant.room?.property?.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const eContractData = typeof tenant.eContractData === 'object' && tenant.eContractData !== null 
      ? tenant.eContractData 
      : {};

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        eContractStatus: "SENT",
        eContractToken: token,
        eContractData: {
          ...eContractData,
          landlordSignature: body.landlordSignature
        }
      }
    });

    return NextResponse.json({ 
      token: updatedTenant.eContractToken, 
      status: updatedTenant.eContractStatus 
    });
  } catch (error) {
    console.error("Error sending e-contract:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
