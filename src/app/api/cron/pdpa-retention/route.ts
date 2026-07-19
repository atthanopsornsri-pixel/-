import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/pdpa-retention
 * PDPA — anonymize ข้อมูลส่วนบุคคล (PII) ของผู้เช่าที่ย้ายออกครบระยะเก็บข้อมูลแล้ว
 * Vercel Cron: ทุกวัน · Protected ด้วย CRON_SECRET
 *
 * นโยบาย (ตามที่ที่ปรึกษาระบุ):
 *  - เก็บข้อมูลได้ N วันหลังย้ายออก (default 90 วัน, ปรับผ่าน env PDPA_RETENTION_DAYS)
 *  - ครบกำหนด → ล้าง PII เป็น null แต่ "เก็บ row + ประวัติบิลไว้" (ตรงตาม PDPA
 *    'เก็บเท่าที่จำเป็น' โดยไม่ทำลายข้อมูลการเงินย้อนหลังที่ใช้ทางบัญชี/ภาษี)
 *  - ตั้ง dataAnonymizedAt กัน cron ทำซ้ำ record เดิม
 *
 * ไม่แตะ: depositAmount, moveOutDate, bills, checkout, eContractStatus (คงประวัติการเงิน)
 * ไม่แตะ User account (auth) — scope นี้เฉพาะ PII ใน Tenant profile
 */
export async function GET(req: Request) {
  const authError = checkCronAuth(req, "/api/cron/pdpa-retention");
  if (authError) return authError;

  try {
    const retentionDays = Number(process.env.PDPA_RETENTION_DAYS) || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // ผู้เช่าที่ย้ายออกเกิน cutoff แล้ว และยังไม่เคยถูก anonymize
    const targets = await prisma.tenant.findMany({
      where: {
        moveOutDate: { not: null, lt: cutoff },
        dataAnonymizedAt: null,
      },
      select: { id: true },
    });

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        anonymized: 0,
        retentionDays,
        timestamp: new Date().toISOString(),
      });
    }

    const now = new Date();
    const result = await prisma.tenant.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: {
        firstName: null,
        lastName: null,
        idCardNumber: null,
        phoneNumber: null,
        address: null,
        emergencyContact: null,
        emergencyPhone: null,
        signatureUrl: null,
        contractIpAddress: null,
        contractUserAgent: null,
        contractPdfUrl: null,
        eContractData: Prisma.DbNull, // Json nullable field → set DB NULL
        eContractToken: null,
        profileCompleted: false,
        dataAnonymizedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      anonymized: result.count,
      retentionDays,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logError("pdpa-retention cron ล้มเหลว", error, { route: "/api/cron/pdpa-retention" });
    return NextResponse.json({ success: false, error: "Retention job failed" }, { status: 500 });
  }
}
