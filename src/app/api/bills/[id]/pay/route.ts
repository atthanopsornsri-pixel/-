import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (!body.slipUrl) {
      return NextResponse.json({ message: "Missing slipUrl" }, { status: 400 });
    }

    // Update bill status to PENDING and attach slip
    const updated = await prisma.bill.update({
      where: { id },
      data: {
        status: "PENDING",
        slipUrl: body.slipUrl,
        paymentDate: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating slip:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
