import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Owner ดึงใบแจ้งหนี้ค่าบริการ SaaS ทั้งหมดของตัวเอง (พร้อมรายการย่อย)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { ownerId: session.user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Owner GET invoices error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
