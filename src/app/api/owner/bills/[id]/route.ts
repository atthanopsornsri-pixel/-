import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { slipUrl } = await req.json();

    // Verify ownership
    const bill = await prisma.subscriptionBill.findUnique({
      where: { id: params.id }
    });

    if (!bill || bill.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const updatedBill = await prisma.subscriptionBill.update({
      where: { id: params.id },
      data: { 
        slipUrl,
        status: "PENDING", // PENDING means waiting for admin approval
      }
    });

    return NextResponse.json(updatedBill);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
