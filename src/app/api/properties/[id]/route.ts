import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecurePrisma } from "@/lib/prisma-secure";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const secureDb = await getSecurePrisma();

    const property = await secureDb.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
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
    const secureDb = await getSecurePrisma();

    // Verify ownership via SecureDB automatically
    const property = await secureDb.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ message: "Not found or forbidden" }, { status: 403 });
    }

    const updated = await secureDb.property.update({
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
        // ── ค่าเริ่มต้นบิลเข้าอยู่ ──
        defaultSecurityDeposit: body.defaultSecurityDeposit !== undefined ? body.defaultSecurityDeposit : property.defaultSecurityDeposit,
        defaultAdvanceRent: body.defaultAdvanceRent !== undefined ? body.defaultAdvanceRent : property.defaultAdvanceRent,
        defaultKeyDeposit: body.defaultKeyDeposit !== undefined ? body.defaultKeyDeposit : property.defaultKeyDeposit,
        defaultCarFee: body.defaultCarFee !== undefined ? body.defaultCarFee : property.defaultCarFee,
        defaultMotorcycleFee: body.defaultMotorcycleFee !== undefined ? body.defaultMotorcycleFee : property.defaultMotorcycleFee,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
