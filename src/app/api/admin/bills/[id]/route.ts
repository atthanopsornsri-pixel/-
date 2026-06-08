import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICES, type PlanTierKey } from "@/lib/pricing";

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

    // ถ้าอนุมัติ → บันทึกวันที่ชำระ + ต่ออายุ planExpiresAt ของเจ้าของหอ
    if (status === "PAID") {
      updateData.paidAt = new Date();

      // Fetch invoice with items + owner to determine billing cycle and current plan
      const invoice = await prisma.invoice.findUnique({
        where: { id: resolvedParams.id },
        include: {
          items: true,
          owner: { select: { id: true, planTier: true, planExpiresAt: true } }
        }
      });

      if (invoice?.owner) {
        const platformItem = invoice.items.find(i => i.type === "PLATFORM_FEE");

        if (platformItem) {
          // ตรวจจาก description ว่าเป็นรายปีหรือรายเดือน
          const isYearly = platformItem.description.includes("รายปี");
          const months = isYearly ? 12 : 1;

          // ต่ออายุจากวันหมดอายุเดิม (ถ้ายังไม่หมด) หรือจากวันปัจจุบัน (ถ้าหมดแล้ว)
          const now = new Date();
          const currentExpiry = invoice.owner.planExpiresAt
            ? new Date(invoice.owner.planExpiresAt)
            : now;
          const baseDate = currentExpiry > now ? currentExpiry : now;
          const newExpiry = new Date(baseDate);
          newExpiry.setMonth(newExpiry.getMonth() + months);

          // ตรวจจาก description ว่าเป็น planTier ไหน
          let newPlanTier: string = invoice.owner.planTier;
          for (const [tierKey, tierData] of Object.entries(PLAN_PRICES)) {
            if (platformItem.description.includes(tierData.label)) {
              newPlanTier = tierKey;
              break;
            }
          }

          // อัปเดต owner record ในธุรกรรมเดียวกับ invoice
          await prisma.user.update({
            where: { id: invoice.owner.id },
            data: {
              planTier: newPlanTier as any,
              planExpiresAt: newExpiry,
            }
          });
        }
      }
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
