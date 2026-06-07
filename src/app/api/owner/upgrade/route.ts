import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PLAN_PRICES,
  SMS_PRICES,
  generateInvoiceNumber,
  getPlatformFeeDescription,
  getSmsAddonDescription,
  type PlanTierKey,
  type SmsTierKey,
} from "@/lib/pricing";

// POST: Owner อัพเกรดแพ็กเกจ → สร้าง Invoice แบบแยกรายการอัตโนมัติ
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { planTier, cycle } = await req.json(); // cycle = "MONTHLY" | "YEARLY"

    const planKey = planTier as PlanTierKey;
    if (!PLAN_PRICES[planKey]) {
      return NextResponse.json({ message: "แพ็กเกจไม่ถูกต้อง" }, { status: 400 });
    }

    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // ตรวจสอบว่ามี Invoice เดือนนี้แล้วหรือยัง
    const existing = await prisma.invoice.findUnique({
      where: { ownerId_month_year: { ownerId: session.user.id, month, year } }
    });
    if (existing) {
      return NextResponse.json({ message: `มีใบแจ้งหนี้เดือน ${month}/${year} แล้ว` }, { status: 409 });
    }

    // ดึงข้อมูล SMS Addon (ถ้ามี)
    const smsAddon = await prisma.smsAddon.findUnique({
      where: { ownerId: session.user.id }
    });

    // สร้าง InvoiceItems
    const items: { type: "PLATFORM_FEE" | "SMS_ADDON"; description: string; quantity: number; unitPrice: number; amount: number }[] = [];

    // Item 1: ค่าบริการระบบหลัก
    const platformAmount = cycle === "YEARLY" ? PLAN_PRICES[planKey].yearly : PLAN_PRICES[planKey].monthly;
    items.push({
      type: "PLATFORM_FEE",
      description: getPlatformFeeDescription(planKey, cycle),
      quantity: 1,
      unitPrice: platformAmount,
      amount: platformAmount,
    });

    // Item 2: แพ็กเกจเสริม SMS (ถ้ามี)
    if (smsAddon && smsAddon.isActive) {
      const smsKey = smsAddon.tier as SmsTierKey;
      const smsPrices = SMS_PRICES[smsKey];
      if (smsPrices) {
        items.push({
          type: "SMS_ADDON",
          description: getSmsAddonDescription(smsKey),
          quantity: 1,
          unitPrice: smsPrices.monthly,
          amount: smsPrices.monthly,
        });
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // สร้างเลขที่ใบแจ้งหนี้
    const invoiceCount = await prisma.invoice.count({ where: { year, month } });
    const invoiceNumber = generateInvoiceNumber(year, month, invoiceCount + 1);

    const dueDate = new Date(year, month, 0); // วันสุดท้ายของเดือน

    // อัปเดต planTier + สร้าง Invoice ในธุรกรรมเดียว
    const [, newInvoice] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { planTier: planTier as any }
      }),
      prisma.invoice.create({
        data: {
          invoiceNumber,
          ownerId: session.user.id,
          month,
          year,
          totalAmount,
          dueDate,
          status: "UNPAID",
          items: {
            create: items.map(item => ({
              type: item.type,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            }))
          }
        },
        include: { items: true }
      })
    ]);

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error("Owner upgrade error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
