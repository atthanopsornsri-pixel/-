import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TENANT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    if (!body.slipUrl) {
      return NextResponse.json({ message: "Missing slipUrl" }, { status: 400 });
    }

    // Get tenant's room
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant || !tenant.roomId) {
      return NextResponse.json({ message: "You don't have an assigned room" }, { status: 400 });
    }

    // Find the bill
    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill || bill.roomId !== tenant.roomId) {
      return NextResponse.json({ message: "Unauthorized: This bill does not belong to your room" }, { status: 403 });
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
