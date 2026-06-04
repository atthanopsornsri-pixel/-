import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const bills = await prisma.subscriptionBill.findMany({
      include: {
        owner: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ownerId, month, year, amount } = body;

    if (!ownerId || !month || !year || !amount) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const newBill = await prisma.subscriptionBill.create({
      data: {
        ownerId,
        month,
        year,
        amount,
        status: "UNPAID",
      }
    });

    return NextResponse.json(newBill, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
