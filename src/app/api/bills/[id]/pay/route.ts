import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (!body.slipUrl) {
      return NextResponse.json({ message: "Missing slipUrl" }, { status: 400 });
    }

    // Find the bill
    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    if (bill.status === "PAID") {
      return NextResponse.json({ message: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" }, { status: 400 });
    }

    // Optional: If tenant has a session, perform room validation
    const session = await getServerSession(authOptions);
    if (session && session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (tenant && tenant.roomId && bill.roomId !== tenant.roomId) {
        return NextResponse.json({ message: "Unauthorized: This bill does not belong to your room" }, { status: 403 });
      }
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
