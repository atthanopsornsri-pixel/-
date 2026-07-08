import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify owner has access to this bill
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: { include: { owner: { select: { lineChannelAccessToken: true } } } },
            tenants: {
              where: { isDeleted: false },
              select: { lineUserId: true, firstName: true, lastName: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!bill || bill.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // บิลที่ชำระแล้วห้ามอนุมัติซ้ำ
    if (bill.status === "PAID") {
      return NextResponse.json({ message: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" }, { status: 400 });
    }

    // Update bill status to PAID + sync paidAmount กับ totalAmount แบบอะตอมมิก
    const result = await prisma.bill.updateMany({
      where: { id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAmount: bill.totalAmount,
        paymentDate: bill.paymentDate ?? new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" }, { status: 400 });
    }

    const updated = await prisma.bill.findUnique({
      where: { id }
    });

    // แจ้งผู้เช่าทาง LINE ว่าเจ้าของยืนยันการชำระแล้ว
    const tenant = bill.room.tenants[0];
    const lineToken = bill.room.property.owner?.lineChannelAccessToken;
    if (lineToken && tenant?.lineUserId) {
      const tenantName = [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") || "ผู้เช่า";
      const yearBE = bill.year + 543;
      const rangeLabel = bill.type === "CHECKIN" ? "บิลเข้าอยู่" : `เดือน ${bill.month}/${yearBE}`;
      const tenantMsg = [
        `✅ ยืนยันการชำระเงินเรียบร้อยแล้ว`,
        `สวัสดีคุณ${tenantName} 🙏`,
        `━━━━━━━━━━━━━━`,
        `🚪 ห้อง ${bill.room.number}  |  ${rangeLabel}`,
        `💰 ยอดที่ชำระ: ฿${bill.totalAmount.toLocaleString()}`,
        `━━━━━━━━━━━━━━`,
        `ขอบคุณที่ชำระตรงเวลา 💚`,
      ].join("\n");
      const tenantLineId = tenant.lineUserId;
      after(() =>
        sendLineOAMessage(tenantLineId, tenantMsg, lineToken)
          .catch((err) => console.error("[LINE] approve notify error:", err))
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error approving slip:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
