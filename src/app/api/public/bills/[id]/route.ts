import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Find bill without requiring authentication
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: {
              select: {
                name: true,
                promptPayNo: true,
                promptPayName: true,
              }
            }
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Error fetching public bill:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
