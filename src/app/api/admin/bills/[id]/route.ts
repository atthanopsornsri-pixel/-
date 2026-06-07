import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: Admin อนุมัติ/ปฏิเสธสลิปใบแจ้งหนี้
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { status, note } = await req.json();

    const updateData: Record<string, unknown> = { status };

    // ถ้าอนุมัติ → บันทึกวันที่ชำระ
    if (status === "PAID") {
      updateData.paidAt = new Date();
    }

    // ถ้ามีหมายเหตุ
    if (note !== undefined) {
      updateData.note = note;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: { items: true }
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error("Admin PATCH invoice error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
