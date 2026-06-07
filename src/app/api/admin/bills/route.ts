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

// GET: Admin ดึงใบแจ้งหนี้ทั้งหมด (พร้อมรายการย่อย + ข้อมูลเจ้าของหอ)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      include: {
        items: true,
        owner: {
          select: { name: true, email: true, planTier: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Admin GET invoices error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: Admin สร้างใบแจ้งหนี้ใหม่ให้เจ้าของหอพัก (แยกรายการอัตโนมัติ)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ownerId, month, year, cycle = "MONTHLY" } = body;

    if (!ownerId || !month || !year) {
      return NextResponse.json({ message: "กรุณาระบุ ownerId, month, year" }, { status: 400 });
    }

    // ดึงข้อมูลเจ้าของหอพัก
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      include: { smsAddon: true }
    });

    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ message: "ไม่พบเจ้าของหอพัก" }, { status: 404 });
    }

    // ตรวจสอบว่ามี Invoice เดือนนี้แล้วหรือยัง
    const existing = await prisma.invoice.findUnique({
      where: { ownerId_month_year: { ownerId, month, year } }
    });
    if (existing) {
      return NextResponse.json({ message: `มีใบแจ้งหนี้เดือน ${month}/${year} สำหรับเจ้าของหอรายนี้แล้ว` }, { status: 409 });
    }

    // สร้าง InvoiceItems
    const items: { type: "PLATFORM_FEE" | "SMS_ADDON" | "DISCOUNT" | "OTHER"; description: string; quantity: number; unitPrice: number; amount: number }[] = [];

    // Item 1: ค่าบริการระบบหลัก
    const planKey = owner.planTier as PlanTierKey;
    const planPrices = PLAN_PRICES[planKey] || PLAN_PRICES.STARTER;
    const platformAmount = cycle === "YEARLY" ? planPrices.yearly : planPrices.monthly;
    items.push({
      type: "PLATFORM_FEE",
      description: getPlatformFeeDescription(planKey, cycle),
      quantity: 1,
      unitPrice: platformAmount,
      amount: platformAmount,
    });

    // Item 2: แพ็กเกจเสริม SMS (ถ้ามี)
    if (owner.smsAddon && owner.smsAddon.isActive) {
      const smsKey = owner.smsAddon.tier as SmsTierKey;
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

    // คำนวณยอดรวม
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // สร้างเลขที่ใบแจ้งหนี้
    const invoiceCount = await prisma.invoice.count({
      where: { year, month }
    });
    const invoiceNumber = generateInvoiceNumber(year, month, invoiceCount + 1);

    // กำหนดวันครบกำหนด (สิ้นเดือน)
    const dueDate = new Date(year, month, 0); // วันสุดท้ายของเดือน

    // สร้าง Invoice + Items ในรอบเดียว
    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        ownerId,
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
      include: {
        items: true,
        owner: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error("Admin POST invoice error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
