/**
 * Thaibulksms SMS Notification Utility
 * ──────────────────────────────────────
 * API v2: https://api-v2.thaibulksms.com
 * Auth: HTTP Basic (apiKey:apiSecret)
 * Docs: https://www.thaibulksms.com/sms-api/
 */

export interface SmsSendResult {
  success: boolean;
  error?: string;
  remaining?: number;
}

/**
 * ส่ง SMS ผ่าน Thaibulksms API v2
 * @param to  เบอร์โทรปลายทาง (09xxxxxxxx หรือ 6xxxxxxxxx)
 * @param message  ข้อความ (รองรับภาษาไทย Unicode)
 * @param apiKey  Thaibulksms API Key
 * @param apiSecret  Thaibulksms API Secret
 * @param senderId  ชื่อผู้ส่ง (max 11 chars, default "JadHor")
 */
export async function sendThaibulkSms(
  to: string,
  message: string,
  apiKey: string,
  apiSecret: string,
  senderId: string = "JadHor"
): Promise<SmsSendResult> {
  if (!to || !message || !apiKey || !apiSecret) {
    console.error("[SMS] Missing required parameters");
    return { success: false, error: "ข้อมูลไม่ครบถ้วน" };
  }

  // Normalize phone number: 09xxxxxxxx → 669xxxxxxxx
  const normalizedPhone = normalizeThaiPhone(to);
  if (!normalizedPhone) {
    return { success: false, error: `เบอร์โทร "${to}" ไม่ถูกต้อง` };
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch("https://api-v2.thaibulksms.com/message/sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        msisdn: normalizedPhone,
        message,
        sender: senderId.slice(0, 11), // max 11 chars
        force: "standard",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = data?.message || data?.error || `HTTP ${response.status}`;
      console.error("[SMS] Thaibulksms API error:", errMsg);
      return { success: false, error: errMsg };
    }

    // Thaibulksms v2: { status: "200", ... }
    if (data?.status === "200" || response.status === 200) {
      return { success: true, remaining: data?.remaining };
    }

    return { success: false, error: data?.message || "ส่ง SMS ไม่สำเร็จ" };
  } catch (error) {
    console.error("[SMS] Connection error:", error);
    return { success: false, error: "ไม่สามารถเชื่อมต่อกับ Thaibulksms API ได้" };
  }
}

/**
 * แปลงเบอร์โทรไทยให้เป็น format ที่ Thaibulksms รับ (66xxxxxxxxx)
 * รับ: 0812345678, 812345678, 66812345678, +66812345678
 * คืน: 66812345678 หรือ null ถ้าไม่ถูกต้อง
 */
export function normalizeThaiPhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-().]/g, "");

  if (/^\+66\d{9}$/.test(cleaned)) return cleaned.slice(1); // +66... → 66...
  if (/^66\d{9}$/.test(cleaned)) return cleaned;             // 66... → keep
  if (/^0\d{9}$/.test(cleaned)) return "66" + cleaned.slice(1); // 0x → 66x
  if (/^\d{9}$/.test(cleaned)) return "66" + cleaned;        // 9-digit → 66+9

  return null; // invalid
}

/**
 * Helper สำหรับส่ง SMS โดยดึง credentials จาก smsAddon record
 * และหัก quota ใน DB หลังส่งสำเร็จ
 */
import { prisma } from "./prisma";

export async function sendSmsWithAddon(
  ownerId: string,
  toPhone: string,
  message: string
): Promise<SmsSendResult> {
  // ดึง addon + check quota
  const addon = await prisma.smsAddon.findUnique({
    where: { ownerId },
    select: {
      id: true,
      isActive: true,
      quota: true,
      used: true,
      resetMonth: true,
      resetYear: true,
      thaibulkApiKey: true,
      thaibulkApiSecret: true,
      thaibulkSenderId: true,
    },
  });

  if (!addon || !addon.isActive) {
    return { success: false, error: "SMS Addon ไม่ได้เปิดใช้งาน" };
  }

  if (!addon.thaibulkApiKey || !addon.thaibulkApiSecret) {
    return { success: false, error: "ยังไม่ได้ตั้งค่า Thaibulksms API credentials" };
  }

  // Auto-reset quota ถ้าขึ้นเดือนใหม่
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  let currentUsed = addon.used;

  if (addon.resetYear < currentYear || (addon.resetYear === currentYear && addon.resetMonth < currentMonth)) {
    // เดือนใหม่ — reset
    await prisma.smsAddon.update({
      where: { id: addon.id },
      data: { used: 0, resetMonth: currentMonth, resetYear: currentYear },
    });
    currentUsed = 0;
  }

  if (currentUsed >= addon.quota) {
    return { success: false, error: `โควตา SMS หมดแล้ว (${currentUsed}/${addon.quota} ข้อความ/เดือน)` };
  }

  // ส่ง SMS
  const result = await sendThaibulkSms(
    toPhone,
    message,
    addon.thaibulkApiKey,
    addon.thaibulkApiSecret,
    addon.thaibulkSenderId ?? "JadHor"
  );

  // หัก quota เมื่อสำเร็จ
  if (result.success) {
    await prisma.smsAddon.update({
      where: { id: addon.id },
      data: { used: { increment: 1 } },
    });
  }

  return result;
}
