"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
      where: { id: billId }
    });

    if (!bill) {
      return { success: false, error: "Forbidden: Bill not found or you do not have permission to access it." };
    }

    if (bill.status === "PAID" || bill.status === "PENDING") {
      return { success: false, error: "Bill is already paid or awaiting approval." };
    }

    // 2. Prepare file for Supabase Upload
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate secure filename using Date to prevent caching issues and CUID/BillID for uniqueness
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `slips/${billId}-${Date.now()}.${fileExtension}`;

    // Initialize Supabase with SERVICE ROLE to bypass Private Bucket RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
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

    // 4. Update the Database
    // Set status to PENDING (which means 'WAITING_APPROVAL' in our schema)
    await secureDb.bill.update({
      where: { id: billId },
      data: {
        status: "PENDING",
        slipUrl: filename, // Store the relative path for the signed URL generator
      }
    });

    // Revalidate the dashboard so the UI instantly hides the upload form
    revalidatePath("/tenant/dashboard");

    return { success: true, message: "อัปโหลดสลิปสำเร็จ! กรุณารอแอดมินตรวจสอบ" };

  } catch (error: any) {
    console.error("Submit Payment Slip Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
