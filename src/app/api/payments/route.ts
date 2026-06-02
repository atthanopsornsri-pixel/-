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

    // SIMULATED SLIPOK API VERIFICATION
    // In a real app, we would send `slipUrl` or the image file to SlipOk API
    // and wait for the verification result. Here we assume it's always valid.
    const isSlipValid = true; 

    if (!isSlipValid) {
      return NextResponse.json({ message: "Slip verification failed" }, { status: 400 });
    }

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        billId,
        amount: Number(amount),
        slipUrl,
        status: "APPROVED",
        verifiedAt: new Date(),
      },
    });

    // Update Bill Status to PAID
    await prisma.bill.update({
      where: { id: billId },
      data: { status: "PAID" },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
