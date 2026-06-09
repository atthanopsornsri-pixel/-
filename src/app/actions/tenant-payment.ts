"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { verifySlip, receiverMatchesPromptPay } from "@/lib/slip-verification";

/**
 * PHASE 10: Tenant Payment Portal (Upload Action)
 * Securely uploads a slip image bypassing RLS and updates the Bill status.
 */
export async function submitPaymentSlip(prevState: any, formData: FormData) {
  try {
    const billId = formData.get("billId") as string;
    const file = formData.get("file") as File;

    if (!billId || !file) {
      return { success: false, error: "Missing bill ID or file." };
    }

    // Validate file size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "ไฟล์ใหญ่เกิน 5 MB — กรุณาบีบอัดรูปก่อนอัปโหลด" };
    }

    // Validate file type (images only)
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "ประเภทไฟล์ไม่รองรับ — อนุญาตเฉพาะ JPEG, PNG, WebP, GIF" };
    }

    const secureDb = await getSecurePrisma();

    // 1. Security Check: Ensure the logged-in TENANT actually owns this bill.
    // getSecurePrisma() automatically injects `where: { room: { tenants: { some: { userId } } } }` for TENANT role!
    const bill = await secureDb.bill.findUnique({
      where: { id: billId },
      include: {
        room: { select: { property: { select: { promptPayNo: true } } } },
      },
    });

    if (!bill) {
      return { success: false, error: "Forbidden: Bill not found or you do not have permission to access it." };
    }

    if (bill.status === "PAID" || bill.status === "PENDING") {
      return { success: false, error: "Bill is already paid or awaiting approval." };
    }

    // 2. Prepare file for Supabase Upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── ตรวจสลิปอัตโนมัติ (ถ้าตั้งค่า provider ไว้) ──
    const verification = await verifySlip({
      imageBuffer: buffer,
      contentType: file.type || "image/jpeg",
      expectedAmount: bill.totalAmount,
    });

    if (verification.duplicate) {
      return { success: false, error: "สลิปนี้เคยถูกใช้ชำระเงินไปแล้ว ไม่สามารถใช้ซ้ำได้" };
    }

    // Generate secure filename using Date to prevent caching issues and CUID/BillID for uniqueness
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `slips/${billId}-${Date.now()}.${fileExtension}`;

    // Initialize Supabase with SERVICE ROLE to bypass Private Bucket RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[SLIP UPLOAD] Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
      return { success: false, error: "ระบบจัดเก็บสลิปยังไม่ได้ตั้งค่า (ติดต่อผู้ดูแลระบบ)" };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Upload to Private Bucket (Phase 3 logic used "documents" bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filename, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      return { success: false, error: "Failed to upload slip image." };
    }

    // 4. ตัดสินสถานะบิลตามผลการตรวจสลิป
    let newStatus: "PENDING" | "PAID" | "PARTIAL" = "PENDING";
    let paidAmount = bill.paidAmount;
    let autoVerified = false;

    if (verification.enabled && verification.verified) {
      const slipAmount = verification.amount ?? 0;
      const receiverOk = receiverMatchesPromptPay(
        verification.receiverAccount,
        bill.room?.property?.promptPayNo
      );

      if (!receiverOk) {
        newStatus = "PENDING";
      } else if (slipAmount >= bill.totalAmount) {
        newStatus = "PAID";
        paidAmount = bill.totalAmount;
        autoVerified = true;
      } else if (slipAmount > 0 && slipAmount < bill.totalAmount) {
        newStatus = "PARTIAL";
        paidAmount = slipAmount;
        autoVerified = true;
      }
    }

    // 5. Update the Database
    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: newStatus,
        slipUrl: filename, // Store the relative path for the signed URL generator
        paidAmount,
        paymentDate: new Date(),
      }
    });

    // Revalidate the dashboard so the UI instantly hides the upload form
    revalidatePath("/tenant/dashboard");

    if (autoVerified && newStatus === "PAID") {
      return { success: true, message: "ระบบตรวจสอบสลิปอัตโนมัติแล้ว — ชำระเงินสำเร็จ ✓" };
    }
    if (autoVerified && newStatus === "PARTIAL") {
      return { success: true, message: "ระบบได้รับยอดชำระบางส่วนแล้ว โปรดติดต่อเจ้าของหอเรื่องยอดคงเหลือ" };
    }
    return { success: true, message: "อัปโหลดสลิปสำเร็จ! กรุณารอเจ้าของหอตรวจสอบ" };

  } catch (error: any) {
    console.error("Submit Payment Slip Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
