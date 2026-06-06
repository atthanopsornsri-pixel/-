import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TENANT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { billId, amount, slipUrl } = await req.json();

    if (!billId || !amount || !slipUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Get tenant's room
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant || !tenant.roomId) {
      return NextResponse.json({ message: "You don't have an assigned room" }, { status: 400 });
    }

    // Verify ownership of the bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill || bill.roomId !== tenant.roomId) {
      return NextResponse.json({ message: "Unauthorized: This bill does not belong to your room" }, { status: 403 });
    }

    // SIMULATED SLIPOK API VERIFICATION
    // In a real app, we would send `slipUrl` or the image file to SlipOk API
    // and wait for the verification result. Here we assume it's always valid.
    const isSlipValid = true; 

    if (!isSlipValid) {
      return NextResponse.json({ message: "Slip verification failed" }, { status: 400 });
    }

    // Create Payment Record (Pending owner approval)
    const payment = await prisma.payment.create({
      data: {
        billId,
        amount: Number(amount),
        slipUrl,
        status: "PENDING",
      },
    });

    // Update Bill Status to PENDING
    await prisma.bill.update({
      where: { id: billId },
      data: { 
        status: "PENDING",
        slipUrl,
        paymentDate: new Date(),
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
