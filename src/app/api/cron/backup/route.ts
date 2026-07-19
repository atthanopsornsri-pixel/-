import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // 60 วินาที — backup อาจใช้เวลา

/**
 * Daily DB backup snapshot → Supabase Storage (backups/YYYY-MM-DD.json)
 * Vercel Cron: ทุกวัน 02:00 UTC (09:00 เวลาไทย)
 * Protected: CRON_SECRET
 *
 * เก็บ: users, properties, rooms, bills 30 วันล่าสุด, tenants
 * ไม่เก็บ: passwords, tokens, credentials (เก็บไว้ใน DB เป็น source of truth)
 */
export async function GET(req: Request) {
  const authError = checkCronAuth(req, "/api/cron/backup");
  if (authError) return authError;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    // ⚠️ นี่คือ "data-audit export" ไม่ใช่ disaster-recovery backup ที่แท้จริง
    // ตั้งใจ export ข้อมูล operational ให้ครบทุกตาราง (ไม่มี cutoff เวลา) เพื่อใช้
    // ตรวจสอบ/สร้างข้อมูลใหม่ได้ถ้าจำเป็น แต่ **ไม่รวม credentials/passwords/tokens**
    // (การเขียน bcrypt hash + PII ลง Storage bucket = security downgrade)
    //
    // การกู้คืนระบบเต็มรูปแบบ (auth, PITR) ต้องใช้ Supabase PITR หรือ off-site pg_dump
    // — ดู production_artifacts/DISASTER_RECOVERY.md
    const [
      users, properties, propertyStaff, rooms, tenants, vehicles,
      bills, checkouts, payments, maintenance, parcels, meterSubmissions,
      invoices, smsAddons, systemSettings,
    ] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, username: true, name: true, role: true, planTier: true, planExpiresAt: true, pdpaAcceptedAt: true, createdAt: true },
      }),
      prisma.property.findMany({ where: { isDeleted: false } }),
      prisma.propertyStaff.findMany(),
      prisma.room.findMany({ where: { isDeleted: false } }),
      prisma.tenant.findMany({ where: { isDeleted: false } }),
      prisma.vehicle.findMany(),
      prisma.bill.findMany({ where: { isDeleted: false } }),
      prisma.checkout.findMany(),
      prisma.payment.findMany(),
      prisma.maintenanceRequest.findMany(),
      prisma.parcel.findMany(),
      prisma.meterSubmission.findMany(),
      prisma.invoice.findMany({ include: { items: true } }),
      prisma.smsAddon.findMany({ select: { id: true, ownerId: true, tier: true, quota: true, used: true, isActive: true } }),
      prisma.systemSettings.findMany(),
    ]);

    const data = {
      users, properties, propertyStaff, rooms, tenants, vehicles,
      bills, checkouts, payments, maintenance, parcels, meterSubmissions,
      invoices, smsAddons, systemSettings,
    };

    const snapshot = {
      exportedAt: new Date().toISOString(),
      note: "data-audit export (ไม่ใช่ full DR backup — ไม่รวม auth credentials; ดู DISASTER_RECOVERY.md)",
      counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as unknown[]).length])),
      data,
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backups/${dateStr}.json`;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.storage
      .from("documents")
      .upload(filename, JSON.stringify(snapshot, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      filename,
      counts: snapshot.counts,
      timestamp: snapshot.exportedAt,
    });
  } catch (error) {
    logError("DB backup ล้มเหลว", error, { route: "/api/cron/backup" });
    return NextResponse.json({ success: false, error: "Backup failed" }, { status: 500 });
  }
}
