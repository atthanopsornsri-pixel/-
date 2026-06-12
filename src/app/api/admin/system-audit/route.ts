import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runSystemSecurityAudit } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized: Admins only" }, { status: 401 });
    }

    // 1. Fetch Room Counts
    const totalRooms = await prisma.room.count({ where: { isDeleted: false } });
    const occupiedRooms = await prisma.room.count({ where: { isDeleted: false, status: "OCCUPIED" } });
    const vacantRooms = await prisma.room.count({ where: { isDeleted: false, status: "AVAILABLE" } });

    // 2. Inconsistent Rooms (OCCUPIED but has no active tenant linked)
    const inconsistentRoomsCount = await prisma.room.count({
      where: {
        isDeleted: false,
        status: "OCCUPIED",
        tenants: {
          none: { isDeleted: false }
        }
      }
    });

    // 3. Fetch Tenant data for verification
    const tenants = await prisma.tenant.findMany({
      where: { isDeleted: false }
    });

    const invalidIdCardsCount = tenants.filter(
      t => !t.idCardNumber || t.idCardNumber.replace(/[-\s]/g, "").length !== 13
    ).length;

    const emptyPhoneNumbersCount = tenants.filter(t => !t.phoneNumber?.trim()).length;

    // 4. Invoice check (Check if itemized sum doesn't match total)
    let invoiceMismatchesCount = 0;
    try {
      const invoices = await prisma.invoice.findMany({
        include: { items: true }
      });
      for (const inv of invoices) {
        const sum = inv.items.reduce((acc, item) => acc + item.amount, 0);
        if (Math.abs(sum - inv.totalAmount) > 0.05) {
          invoiceMismatchesCount++;
        }
      }
    } catch (e) {
      console.warn("Invoice schema might not be fully active, skipping mismatch count:", e);
    }

    // 5. Check environment variables
    const envStatus = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SLIPOK_API_KEY: !!process.env.SLIPOK_API_KEY,
      ADMIN_LINE_NOTIFY_TOKEN: !!process.env.ADMIN_LINE_NOTIFY_TOKEN,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    };

    // 6. Run Claude evaluation
    const reportMarkdown = await runSystemSecurityAudit({
      totalRooms,
      occupiedRooms,
      vacantRooms,
      inconsistentRoomsCount,
      invalidIdCardsCount,
      emptyPhoneNumbersCount,
      invoiceMismatchesCount,
      envStatus,
    });

    if (!reportMarkdown) {
      return NextResponse.json({ message: "ไม่สามารถประมวลผลรายงานความสมบูรณ์ได้" }, { status: 500 });
    }

    return NextResponse.json({ report: reportMarkdown });
  } catch (error: any) {
    console.error("System security audit failed:", error);
    if (error instanceof Error && error.message === "API_KEY_NOT_CONFIGURED") {
      return NextResponse.json({ message: "กรุณาเปิดใช้งานระบบและตั้งค่ารหัสเชื่อมต่อ (API Key) ในหน้าแอดมินหรือไฟล์ .env ก่อนใช้งาน" }, { status: 400 });
    }
    if (error?.status === 401) {
      return NextResponse.json({ message: "รหัสเชื่อมต่อ (API Key) ไม่ถูกต้องหรือไม่ได้รับอนุญาต กรุณาตรวจสอบข้อมูลคีย์อีกครั้ง" }, { status: 401 });
    }
    return NextResponse.json({ message: "เกิดข้อผิดพลาดในการรันระบบตรวจสอบความสมบูรณ์หลังบ้าน" }, { status: 500 });
  }
}
