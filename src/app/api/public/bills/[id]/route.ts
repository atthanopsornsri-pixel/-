import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Public endpoint (ไม่ต้อง login) — คืนเฉพาะ field ที่หน้า /pay/[id] ใช้จริง
    // ห้ามคืน slipUrl / slipTransRef / tenantId / paymentDate (ข้อมูลอ่อนไหว)
    const bill = await prisma.bill.findUnique({
      where: { id },
      select: {
        id: true,
        month: true,
        year: true,
        rentAmount: true,
        waterAmount: true,
        electricAmount: true,
        totalAmount: true,
        dueDate: true,
        status: true,
        waivedReason: true,
        room: {
          select: {
            number: true,
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
