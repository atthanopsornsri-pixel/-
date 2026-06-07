import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: Owner แนบสลิปโอนเงินค่าบริการ SaaS
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slipUrl } = await req.json();

    // ตรวจสอบว่าเป็น Invoice ของ Owner รายนี้จริง
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!invoice || invoice.ownerId !== session.user.id) {
      return NextResponse.json({ message: "ไม่พบใบแจ้งหนี้" }, { status: 404 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: { 
        slipUrl,
        status: "PENDING", // PENDING = รอ Admin ตรวจสอบสลิป
      },
      include: { items: true }
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error("Owner PATCH invoice error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
