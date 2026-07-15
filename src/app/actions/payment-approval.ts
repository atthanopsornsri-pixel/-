"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * PHASE 8: Manual Slip Verification
 * Approves a bill, marking it as PAID.
 */
export async function approveBill(billId: string) {
  try {
    const secureDb = await getSecurePrisma();

    const bill = await secureDb.bill.findUnique({ where: { id: billId }});
    if (!bill) throw new Error("Bill not found");

    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: "PAID",
        paymentDate: new Date(),
        paidAmount: bill.totalAmount, // บันทึกว่าจ่ายเต็ม
      },
    });

    // Revalidate the dashboard and bills routes so the UI updates instantly
    revalidatePath("/dashboard", "layout");

    return { success: true, message: "Bill approved successfully." };
  } catch (error: any) {
    console.error("Failed to approve bill:", error);
    return { success: false, error: "Unauthorized or failed to approve bill." };
  }
}

/**
 * PHASE 8: Manual Slip Verification
 * Rejects a bill, reverting it to UNPAID so the tenant can re-upload.
 */
export async function rejectBill(billId: string, reason?: string) {
  try {
    const secureDb = await getSecurePrisma();

    // Revert the bill status to UNPAID and clear the invalid slip
    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: "UNPAID",
        slipUrl: null, // Clear the rejected slip
        paymentDate: null,
        // If your schema supports storing rejection reasons, add it here.
        // reason: reason // currently not in schema, but passed in case it's needed later
      },
    });

    // Revalidate paths
    revalidatePath("/dashboard", "layout");

    return { success: true, message: "Bill rejected successfully." };
  } catch (error: any) {
    console.error("Failed to reject bill:", error);
    return { success: false, error: "Unauthorized or failed to reject bill." };
  }
}

/**
 * PHASE 13: Partial Payment (Edge Case)
 * Approves a bill but with a partial amount, marking it as PARTIAL.
 */
export async function approvePartialBill(billId: string, paidAmount: number) {
  try {
    const secureDb = await getSecurePrisma();

    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: "PARTIAL",
        paymentDate: new Date(),
        paidAmount: paidAmount, // บันทึกยอดที่จ่ายจริง
      },
    });

    revalidatePath("/dashboard", "layout");
    return { success: true, message: "Partial bill recorded successfully." };
  } catch (error: any) {
    console.error("Failed to record partial bill:", error);
    return { success: false, error: "Unauthorized or failed." };
  }
}

/**
 * ยกเว้น/ละเว้นบิล (Waive) — ต่างจากลบบิล: เก็บประวัติไว้ ผู้เช่าเห็นว่าได้รับการยกเว้น (ไม่ใช่หายไปเงียบๆ)
 * เป็นการตัดสินใจทางการเงิน (ยกหนี้ให้) จำกัดเฉพาะ OWNER เหมือน deposit refund gate
 */
export async function waiveBill(billId: string, reason: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return { success: false, error: "เฉพาะเจ้าของหอพักเท่านั้นที่ยกเว้นบิลได้" };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: "กรุณาระบุเหตุผลที่ยกเว้นบิลนี้" };
    }

    const secureDb = await getSecurePrisma();

    const bill = await secureDb.bill.findUnique({ where: { id: billId } });
    if (!bill) return { success: false, error: "ไม่พบบิลนี้" };

    if (bill.status === "PAID") {
      return { success: false, error: "บิลที่ชำระแล้วไม่สามารถยกเว้นได้ — เพื่อรักษาประวัติการเงิน" };
    }
    if (bill.status === "WAIVED") {
      return { success: false, error: "บิลนี้ถูกยกเว้นไปแล้ว" };
    }

    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: "WAIVED",
        waivedAt: new Date(),
        waivedReason: reason.trim(),
      },
    });

    revalidatePath("/dashboard", "layout");
    return { success: true, message: "ยกเว้นบิลสำเร็จ" };
  } catch (error: any) {
    console.error("Failed to waive bill:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการยกเว้นบิล" };
  }
}
