"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { revalidatePath } from "next/cache";

/**
 * 💰 ดึงรายการเงินประกัน/มัดจำทั้งหมด ของอาคารพัก
 */
export async function getActiveDeposits(propertyId?: string) {
  try {
    const prisma = await getSecurePrisma();

    // ค้นหา tenant ทั้งหมดที่อยู่ห้องที่ระบุ (หรือทุกตึก)
    const tenants = await prisma.tenant.findMany({
      where: {
        roomId: { not: null },
        ...(propertyId && { room: { propertyId } }),
        isDeleted: false,
      },
      include: {
        room: {
          select: {
            id: true,
            number: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        room: {
          number: "asc",
        },
      },
    });

    return { success: true, tenants };
  } catch (error: any) {
    console.error("getActiveDeposits error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลเงินประกัน" };
  }
}

/**
 * 💰 คืนเงินประกัน / มัดจำ (เช็คสิทธิ์ IDOR ผ่าน getSecurePrisma + ตรวจสอบขอบเขตค่าบวกและยอดคงเหลือ)
 */
export async function processDepositRefund(tenantId: string, amount: number, note?: string) {
  try {
    const prisma = await getSecurePrisma();

    if (amount <= 0) {
      return { success: false, error: "จำนวนเงินที่คืนต้องมากกว่า 0 บาท" };
    }

    // findUnique กรองผ่าน Secure Prisma (RLS) เพื่อป้องกัน IDOR
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { depositAmount: true, roomId: true }
    });

    if (!tenant) {
      return { success: false, error: "ไม่พบข้อมูลผู้เช่า หรือไม่มีสิทธิ์เข้าถึง" };
    }

    const currentDeposit = tenant.depositAmount ?? 0;
    if (amount > currentDeposit) {
      return { success: false, error: "จำนวนเงินคืนเกินยอดประกันคงเหลือ" };
    }

    // ทำรายการอัปเดตยอดเงินประกันคงเหลือ
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        depositAmount: {
          decrement: amount,
        },
      },
    });

    revalidatePath("/dashboard/deposits");
    return { success: true, tenant: updatedTenant };
  } catch (error: any) {
    console.error("processDepositRefund error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการคืนเงินประกัน" };
  }
}

/**
 * 💰 หักเงินประกัน / มัดจำ (เช็คสิทธิ์ IDOR ผ่าน getSecurePrisma + ตรวจสอบขอบเขตค่าบวกและยอดคงเหลือ)
 */
export async function processDepositDeduction(tenantId: string, amount: number, reason: string) {
  try {
    const prisma = await getSecurePrisma();

    if (amount <= 0) {
      return { success: false, error: "จำนวนเงินที่หักต้องมากกว่า 0 บาท" };
    }

    if (!reason || reason.trim() === "") {
      return { success: false, error: "กรุณาระบุเหตุผลในการหักเงินประกัน" };
    }

    // findUnique กรองผ่าน Secure Prisma (RLS) เพื่อป้องกัน IDOR
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { depositAmount: true }
    });

    if (!tenant) {
      return { success: false, error: "ไม่พบข้อมูลผู้เช่า หรือไม่มีสิทธิ์เข้าถึง" };
    }

    const currentDeposit = tenant.depositAmount ?? 0;
    if (amount > currentDeposit) {
      return { success: false, error: "จำนวนเงินหักเกินยอดประกันคงเหลือ" };
    }

    // ทำรายการหักเงินประกัน
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        depositAmount: {
          decrement: amount,
        },
      },
    });

    revalidatePath("/dashboard/deposits");
    return { success: true, tenant: updatedTenant };
  } catch (error: any) {
    console.error("processDepositDeduction error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการหักเงินประกัน" };
  }
}
