import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify owner has access to this bill
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });

    if (!bill || bill.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Update bill status to PAID + sync paidAmount กับ totalAmount
    const updated = await prisma.bill.update({
      where: { id },
      data: {
        status: "PAID",
        paidAmount: bill.totalAmount,
        paymentDate: bill.paymentDate ?? new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error approving slip:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
