"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
      return { success: false, error: "ไม่พบบิลดังกล่าว หรือคุณไม่มีสิทธิ์เข้าถึง" };
    }

    if (bill.status === "PAID") {
      return { success: false, error: "บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว" };
    }
    if (bill.status === "PENDING") {
      return { success: false, error: "บิลนี้อยู่ระหว่างรอเจ้าของหอตรวจสอบสลิปอยู่แล้ว — กรุณารอการอนุมัติ" };
    }

    // 2. Prepare file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate secure filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `slips/${billId}-${Date.now()}.${fileExtension}`;

    // 3. เก็บรูปสลิป — รองรับ 2 แบบ:
    //    (ก) ถ้าตั้งค่า Supabase Storage → อัปโหลดเป็นไฟล์
    //    (ข) ถ้าไม่ได้ตั้งค่า → fallback เก็บเป็น base64 ในฐานข้อมูล
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const base64DataUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

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
        console.error("Supabase Upload Error (falling back to base64):", uploadError);
        slipUrlToStore = base64DataUrl;
      } else {
        slipUrlToStore = filename;
      }
    } else {
      slipUrlToStore = base64DataUrl;
    }

    // 4. บันทึก DB เป็น PENDING ทันที (fast path — ก่อน SlipOK verify)
    //    เพื่อป้องกัน Vercel 10s timeout ทำให้ผู้เช่าเห็น error
    //    SlipOK จะถูกเรียกแบบ non-blocking หลังจาก return สำเร็จ
    //    ใช้ updateMany + compound-where ปิดช่อง check-then-write race:
    //    เขียนได้เฉพาะเมื่อบิลยังไม่ PAID/PENDING (กันกดส่งซ้ำเร็ว ๆ / double-submit)
    const upd = await prisma.bill.updateMany({
      where: { id: billId, status: { notIn: ["PAID", "PENDING"] } },
      data: {
        status: "PENDING",
        slipUrl: slipUrlToStore,
        paidAmount: bill.paidAmount,
        paymentDate: new Date(),
      }
    });
    if (upd.count === 0) {
      return { success: false, error: "บิลนี้ถูกดำเนินการไปแล้ว — กรุณารีเฟรชหน้าจอ" };
    }

    revalidatePath("/tenant/dashboard");
    revalidatePath("/dashboard/my-bills");

    // 5. แจ้ง LINE เจ้าของทันทีว่ามีสลิปรอตรวจ
    const ownerToken = bill.room?.property?.owner?.lineChannelAccessToken;
    const ownerLineId = bill.room?.property?.owner?.lineUserId;
    if (ownerToken && ownerLineId) {
      const roomNumber = bill.room?.number || "-";
      const appUrl =
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
        "https://jadhor.vercel.app";
      const ownerMsg = [
        `📬 มีสลิปรอการอนุมัติ!`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚪 ห้อง ${roomNumber}`,
        `💰 ยอดบิล: ฿${bill.totalAmount.toLocaleString()}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `👉 ตรวจสอบและอนุมัติ:`,
        `${appUrl}/dashboard/owner/approvals`,
      ].join("\n");
      sendLineOAMessage(ownerLineId, ownerMsg, ownerToken).catch((err) =>
        console.error("[LINE] owner slip notify error:", err)
      );
    }

    // 6. SlipOK verification — ใช้ after() เพื่อให้รันหลัง response ส่งไปแล้ว
    //    ป้องกัน Vercel Lambda ถูก terminate ก่อน SlipOK ตอบกลับ
    const verifyOpts = {
      billId,
      buffer,
      contentType: file.type || "image/jpeg",
      totalAmount: bill.totalAmount,
      promptPayNo: bill.room?.property?.promptPayNo ?? undefined,
      slipUrl: slipUrlToStore,
    };
    after(() =>
      verifyAndUpgradeStatus(verifyOpts).catch((err) =>
        console.error("[SlipOK async verify] error:", err)
      )
    );

    return { success: true, message: "📨 ส่งสลิปสำเร็จ! เจ้าของหอได้รับแจ้ง LINE แล้ว — กรุณารอการอนุมัติ" };

  } catch (error: any) {
    console.error("Submit Payment Slip Error:", error);
    const msg = error?.message || "";
    if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("fetch")) {
      return { success: false, error: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ชั่วคราว — กรุณาลองใหม่อีกครั้ง" };
    }
    return { success: false, error: "เกิดข้อผิดพลาดภายในระบบ — กรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าของหอ" };
  }
}

// ── Non-blocking SlipOK verification ───────────────────────────────────────
// เรียกหลังจาก return PENDING แล้ว เพื่อไม่ให้ blocking Vercel 10s timeout
async function verifyAndUpgradeStatus(opts: {
  billId: string;
  buffer: Buffer;
  contentType: string;
  totalAmount: number;
  promptPayNo?: string;
  slipUrl: string;
}) {
  try {
    const verification = await verifySlip({
      imageBuffer: opts.buffer,
      contentType: opts.contentType,
      expectedAmount: opts.totalAmount,
    });

    // SlipOK ไม่ได้เปิดใช้งาน หรือตรวจไม่สำเร็จ → คงไว้เป็น PENDING
    if (!verification.enabled || !verification.verified) return;

    // SlipOK ตรวจผ่าน → คำนวณ status ใหม่
    const slipAmount = verification.amount ?? 0;
    const receiverOk = receiverMatchesPromptPay(
      verification.receiverAccount,
      opts.promptPayNo
    );

    let newStatus: "PAID" | "PARTIAL" | null = null;
    let paidAmount: number | undefined;

    if (receiverOk && slipAmount >= opts.totalAmount) {
      newStatus = "PAID";
      paidAmount = opts.totalAmount;
    } else if (receiverOk && slipAmount > 0 && slipAmount < opts.totalAmount) {
      newStatus = "PARTIAL";
      paidAmount = slipAmount;
    }

    if (!newStatus) return; // ยังต้องให้เจ้าของตรวจเอง

    await prisma.bill.update({
      where: { id: opts.billId },
      data: { status: newStatus, paidAmount },
    });

    revalidatePath("/dashboard/my-bills");
    revalidatePath("/dashboard/owner/approvals");
    console.log(`[SlipOK] Bill ${opts.billId} auto-upgraded to ${newStatus}`);
  } catch (err) {
    console.error("[SlipOK async verify] failed:", err);
  }
}
