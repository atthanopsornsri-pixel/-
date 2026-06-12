import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";

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
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ดึงข้อมูลหลัก (ยกเว้น credentials/passwords)
    const [users, properties, rooms, bills, tenants, invoices] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, planTier: true, planExpiresAt: true, createdAt: true },
      }),
      prisma.property.findMany({ where: { isDeleted: false } }),
      prisma.room.findMany({
        where: { isDeleted: false },
        select: { id: true, number: true, floor: true, rentPrice: true, status: true, propertyId: true },
      }),
      prisma.bill.findMany({
        where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true, type: true, month: true, year: true, roomId: true,
          totalAmount: true, paidAmount: true, status: true, dueDate: true, createdAt: true,
        },
      }),
      prisma.tenant.findMany({
        where: { isDeleted: false },
        select: { id: true, userId: true, roomId: true, leaseStart: true, leaseEnd: true, moveInDate: true },
      }),
      prisma.invoice.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: {
          items: { select: { type: true, description: true, amount: true } },
        },
        // ใช้ include แทน select+include ร่วมกัน (Prisma ไม่อนุญาต)
      }).then(invs => invs.map(({ id, invoiceNumber, ownerId, month, year, totalAmount, status, items }) =>
        ({ id, invoiceNumber, ownerId, month, year, totalAmount, status, items })
      )),
    ]);

    const snapshot = {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        properties: properties.length,
        rooms: rooms.length,
        bills: bills.length,
        tenants: tenants.length,
        invoices: invoices.length,
      },
      data: { users, properties, rooms, bills, tenants, invoices },
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
