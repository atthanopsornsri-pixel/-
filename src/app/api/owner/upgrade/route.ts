import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRICES: Record<string, { monthly: number, yearly: number }> = {
  STARTER: { monthly: 199, yearly: 1990 },
  GROWTH: { monthly: 599, yearly: 5990 },
  ENTERPRISE: { monthly: 1299, yearly: 12990 },
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { planTier, cycle } = await req.json(); // cycle = "MONTHLY" | "YEARLY"

    if (!PRICES[planTier as keyof typeof PRICES]) {
      return NextResponse.json({ message: "Invalid Plan" }, { status: 400 });
    }

    const amount = cycle === "YEARLY" ? PRICES[planTier].yearly : PRICES[planTier].monthly;

    const date = new Date();
    
    const newBill = await prisma.subscriptionBill.create({
      data: {
        ownerId: session.user.id,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        amount: amount,
        planTier: planTier as any,
        cycle: cycle,
        status: "UNPAID",
      }
    });

    return NextResponse.json(newBill, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
