/**
 * JadHor OS — Centralized Pricing Constants
 * ==========================================
 * แก้ไขราคาจากจุดนี้จุดเดียว ระบบทั้งหมดจะอัปเดตตาม
 */

// =============================================
// Platform Subscription Plans (ค่าบริการระบบหลัก)
// =============================================

export const PLAN_PRICES = {
  STARTER:    { monthly: 199,   yearly: 1990,   label: "Starter",    maxRooms: 20  },
  GROWTH:     { monthly: 599,   yearly: 5990,   label: "Growth",     maxRooms: 50  },
  ENTERPRISE: { monthly: 1299,  yearly: 12990,  label: "Enterprise", maxRooms: 200 },
} as const;

export type PlanTierKey = keyof typeof PLAN_PRICES;

// =============================================
// SMS Add-on Packages (แพ็กเกจเสริม SMS)
// =============================================

export const SMS_PRICES = {
  SIZE_S: { monthly: 99,   quota: 50,   label: "SMS Size S", recommended: "หอพักขนาดเล็ก (ไม่เกิน 20 ห้อง)" },
  SIZE_M: { monthly: 199,  quota: 120,  label: "SMS Size M", recommended: "หอพักขนาดกลาง (ไม่เกิน 50 ห้อง)" },
  SIZE_L: { monthly: 349,  quota: 250,  label: "SMS Size L", recommended: "หอพักขนาดใหญ่ (ไม่เกิน 100 ห้อง)" },
} as const;

export type SmsTierKey = keyof typeof SMS_PRICES;

// =============================================
// JadHor OS PromptPay (สำหรับรับชำระค่าบริการ SaaS)
// =============================================

export const JADHOR_PROMPTPAY = {
  number: "0640353806",
  name: "อรรถณพ ศรศรี",
} as const;

// =============================================
// Invoice Number Generator
// =============================================

/**
 * สร้างเลขที่ใบแจ้งหนี้อัตโนมัติ
 * รูปแบบ: INV-YYYYMM-XXXX (เช่น INV-202606-0001)
 */
export function generateInvoiceNumber(year: number, month: number, sequence: number): string {
  const mm = String(month).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `INV-${year}${mm}-${seq}`;
}

// =============================================
// Helper: สร้างคำอธิบาย InvoiceItem ภาษาไทย
// =============================================

export function getPlatformFeeDescription(planTier: string, cycle: string): string {
  const plan = PLAN_PRICES[planTier as PlanTierKey];
  if (!plan) return `ค่าบริการระบบหลัก JadHor OS`;
  const cycleLabel = cycle === "YEARLY" ? "รายปี" : "รายเดือน";
  return `ค่าบริการระบบหลัก JadHor OS — แพ็กเกจ ${plan.label} (${cycleLabel})`;
}

export function getSmsAddonDescription(smsTier: string): string {
  const sms = SMS_PRICES[smsTier as SmsTierKey];
  if (!sms) return `แพ็กเกจเสริม SMS`;
  return `บริการเสริม: ระบบส่งสัญญาณ SMS อัจฉริยะ — ${sms.label} (โควตา ${sms.quota} ข้อความ/เดือน)`;
}
