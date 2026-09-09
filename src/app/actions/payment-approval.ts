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

    if (bill.status === "PAID") {
      return { success: false, error: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" };
    }

    if (bill.status === "WAIVED") {
      return { success: false, error: "บิลนี้ได้รับการยกเว้นแล้ว ไม่สามารถอนุมัติได้" };
    }

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
 * PHASE 13: Partial Payment (Option A)
 * บันทึกการอนุมัติชำระเงินบางส่วน โดยระบุ "ยอดสะสมทั้งหมดที่จ่ายมาแล้ว"
 *
 * @param billId - ID ของบิล
 * @param paidAmount - ยอดสะสมทั้งหมดที่จ่ายมาแล้ว (cumulative paid amount)
 *
 * Invariants:
 * 1. Status guard: บิลที่สถานะเป็น PAID แล้วห้ามอนุมัติซ้ำ
 * 2. Auto-advance: ถ้ายอดสะสม >= totalAmount -> ปรับเป็น PAID และ paidAmount = totalAmount (ไม่ค้าง PARTIAL)
 * 3. Partial: ถ้ายอดสะสม < totalAmount -> สถานะเป็น PARTIAL และ paidAmount = ยอดสะสม
 */
export async function approvePartialBill(billId: string, paidAmount: number) {
  try {
    const secureDb = await getSecurePrisma();

    const bill = await secureDb.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return { success: false, error: "ไม่พบบิลดังกล่าว หรือคุณไม่มีสิทธิ์เข้าถึง" };
    }

    if (bill.status === "PAID") {
      return { success: false, error: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" };
    }

    if (bill.status === "WAIVED") {
      return { success: false, error: "บิลนี้ได้รับการยกเว้นแล้ว ไม่สามารถอนุมัติได้" };
    }

    if (typeof paidAmount !== "number" || !Number.isFinite(paidAmount) || isNaN(paidAmount) || paidAmount <= 0) {
      return { success: false, error: "ระบุยอดเงินไม่ถูกต้อง" };
    }

    const roundedPaidAmount = Math.round(paidAmount * 100) / 100;
    if (roundedPaidAmount <= 0) {
      return { success: false, error: "ระบุยอดเงินไม่ถูกต้อง" };
    }

    const isFullyPaid = roundedPaidAmount >= bill.totalAmount;
    const newStatus: "PAID" | "PARTIAL" = isFullyPaid ? "PAID" : "PARTIAL";
    const finalPaidAmount = isFullyPaid ? bill.totalAmount : roundedPaidAmount;

    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: newStatus,
        paymentDate: bill.paymentDate ?? new Date(),
        paidAmount: finalPaidAmount,
      },
    });

    revalidatePath("/dashboard", "layout");
    return {
      success: true,
      message: isFullyPaid
        ? "บิลได้รับการชำระเงินครบถ้วนเรียบร้อยแล้ว"
        : "Partial bill recorded successfully.",
      status: newStatus,
      paidAmount: finalPaidAmount,
    };
  } catch (error: any) {
    console.error("Failed to record partial bill:", error);
    return { success: false, error: error?.message || "Unauthorized or failed." };
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
