"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { revalidatePath } from "next/cache";

/**
 * PHASE 8: Manual Slip Verification
 * Approves a bill, marking it as PAID.
 */
export async function approveBill(billId: string) {
  try {
    const secureDb = await getSecurePrisma();

    // The secureDb wrapper ensures that the owner can only update bills
    // that belong to their properties.
    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: "PAID",
        paymentDate: new Date(),
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
