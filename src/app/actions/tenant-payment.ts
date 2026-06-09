"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { verifySlip, receiverMatchesPromptPay } from "@/lib/slip-verification";
import { sendLineOAMessage } from "@/lib/line";
import { prisma } from "@/lib/prisma";

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
        room: {
          select: {
            number: true,
            property: {
              select: {
                promptPayNo: true,
                owner: {
                  select: {
                    lineChannelAccessToken: true,
                    lineUserId: true,
                  },
                },
              },
            },
          },
        },
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

    // ถ้า SlipOK เปิดใช้งานและตรวจว่ายอดไม่ตรง → แจ้งผู้เช่าทันที ไม่เก็บสลิป
    if (verification.enabled && verification.amountMismatch) {
      const slipAmt = verification.amount;
      const amtStr = slipAmt != null ? `฿${slipAmt.toLocaleString()}` : "ไม่ทราบ";
      return {
        success: false,
        error: `ยอดเงินในสลิป (${amtStr}) ไม่ตรงกับยอดบิล (฿${bill.totalAmount.toLocaleString()}) — กรุณาตรวจสอบและโอนให้ครบจำนวน`,
      };
    }

    // Generate secure filename using Date to prevent caching issues and CUID/BillID for uniqueness
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `slips/${billId}-${Date.now()}.${fileExtension}`;

    // 3. เก็บรูปสลิป — รองรับ 2 แบบ:
    //    (ก) ถ้าตั้งค่า Supabase Storage → อัปโหลดเป็นไฟล์ (เบากว่า, แนะนำ)
    //    (ข) ถ้าไม่ได้ตั้งค่า → fallback เก็บเป็น base64 ในฐานข้อมูลเลย (ใช้งานได้ทันที)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const base64DataUrl = () =>
      `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

    let slipUrlToStore: string;
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (uploadError) {
        // อัปโหลดไม่สำเร็จ → fallback base64 แทนการ fail ทั้ง flow
        console.error("Supabase Upload Error (falling back to base64):", uploadError);
        slipUrlToStore = base64DataUrl();
      } else {
        slipUrlToStore = filename; // เก็บ path ไว้ให้ตัวสร้าง signed URL
      }
    } else {
      // ไม่ได้ตั้งค่า Supabase → เก็บ base64 ในฐานข้อมูล
      slipUrlToStore = base64DataUrl();
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
        slipUrl: slipUrlToStore, // path (Supabase) หรือ base64 data URL (fallback)
        paidAmount,
        paymentDate: new Date(),
      }
    });

    // Revalidate the dashboard so the UI instantly hides the upload form
    revalidatePath("/tenant/dashboard");
    revalidatePath("/dashboard/my-bills");

    // ──────────────────────────────────────────────────────────────────────
    // แจ้ง LINE เจ้าของเมื่อสลิปยังรอตรวจสอบ (PENDING)
    // — เพื่อให้เจ้าของรู้ทันทีว่ามีสลิปใหม่รอการอนุมัติ
    // ──────────────────────────────────────────────────────────────────────
    if (newStatus === "PENDING") {
      const ownerToken = bill.room?.property?.owner?.lineChannelAccessToken;
      const ownerLineId = bill.room?.property?.owner?.lineUserId;
      if (ownerToken && ownerLineId) {
        const roomNumber = bill.room?.number || "-";
        const appUrl =
          process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
          "https://jadhor.vercel.app";
        const noteLines: string[] = [];
        if (verification.enabled && !verification.verified) {
          noteLines.push(`⚠️ หมายเหตุ: ตรวจสลิปอัตโนมัติไม่ผ่าน — รอตรวจด้วยตนเอง`);
        }
        const ownerMsg = [
          `📬 มีสลิปรอการอนุมัติ!`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `🚪 ห้อง ${roomNumber}`,
          `💰 ยอดบิล: ฿${bill.totalAmount.toLocaleString()}`,
          ...noteLines,
          `━━━━━━━━━━━━━━━━━━━━`,
          `👉 ตรวจสอบและอนุมัติ:`,
          `${appUrl}/dashboard/owner/approvals`,
        ].join("\n");
        sendLineOAMessage(ownerLineId, ownerMsg, ownerToken).catch((err) =>
          console.error("[LINE] owner slip notify error:", err)
        );
      }
    }

    if (autoVerified && newStatus === "PAID") {
      return { success: true, message: "✅ ระบบตรวจสอบสลิปอัตโนมัติแล้ว — ชำระเงินสำเร็จ!" };
    }
    if (autoVerified && newStatus === "PARTIAL") {
      return { success: true, message: "⚠️ รับยอดชำระบางส่วนแล้ว — โปรดติดต่อเจ้าของหอเรื่องยอดคงเหลือ" };
    }
    return { success: true, message: "📨 ส่งสลิปสำเร็จ! เจ้าของหอได้รับแจ้ง LINE แล้ว — กรุณารอการอนุมัติ" };

  } catch (error: any) {
    console.error("Submit Payment Slip Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
