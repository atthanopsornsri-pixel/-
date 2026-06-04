import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(property);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = await params;

    // Verify ownership
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        leaseTemplate: body.leaseTemplate !== undefined ? body.leaseTemplate : property.leaseTemplate,
        taxId: body.taxId !== undefined ? body.taxId : property.taxId,
        companyName: body.companyName !== undefined ? body.companyName : property.companyName,
        promptPayNo: body.promptPayNo !== undefined ? body.promptPayNo : property.promptPayNo,
        promptPayName: body.promptPayName !== undefined ? body.promptPayName : property.promptPayName,
        signatureUrl: body.signatureUrl !== undefined ? body.signatureUrl : property.signatureUrl,
        electricRate: body.electricRate !== undefined ? body.electricRate : property.electricRate,
        waterRate: body.waterRate !== undefined ? body.waterRate : property.waterRate,
        defaultCommonFee: body.defaultCommonFee !== undefined ? body.defaultCommonFee : property.defaultCommonFee,
        defaultParkingFee: body.defaultParkingFee !== undefined ? body.defaultParkingFee : property.defaultParkingFee,
        defaultInternetFee: body.defaultInternetFee !== undefined ? body.defaultInternetFee : property.defaultInternetFee,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
