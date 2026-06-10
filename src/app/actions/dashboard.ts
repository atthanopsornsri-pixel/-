"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

const THAI_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export async function getRevenueAnalytics() {
  try {
    const secureDb = await getSecurePrisma();
    const now = new Date();

    // สร้างรายการ 6 เดือนย้อนหลัง
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `${THAI_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(-2)}`,
      };
    });

    const data = await Promise.all(
      months.map(async ({ month, year, label }) => {
        const [paid, outstanding] = await Promise.all([
          secureDb.bill.aggregate({
            where: { month, year, status: "PAID" },
            _sum: { totalAmount: true },
          }),
          secureDb.bill.aggregate({
            where: { month, year, status: { in: ["UNPAID", "OVERDUE", "PENDING"] } },
            _sum: { totalAmount: true },
          }),
        ]);
        return {
          month, year, label,
          revenue: paid._sum.totalAmount ?? 0,
          outstanding: outstanding._sum.totalAmount ?? 0,
        };
      })
    );

    const revenues = data.map(d => d.revenue);
    const maxRevenue = Math.max(...revenues, 1);

    // คาดการณ์เดือนหน้า: weighted average (เดือนล่าสุดมีน้ำหนักมากกว่า)
    const last3 = revenues.slice(-3);
    const weightedSum = last3.reduce((acc, v, i) => acc + v * (i + 1), 0);
    const weightedDiv = last3.reduce((acc, _, i) => acc + (i + 1), 0) || 1;
    const weightedAvg = weightedSum / weightedDiv;
    const trendRaw = last3.length >= 2 && last3[0] > 0
      ? (last3[last3.length - 1] - last3[0]) / last3[0]
      : 0;
    const trend = Math.max(-0.15, Math.min(trendRaw * 0.5, 0.25));
    const prediction = Math.round(weightedAvg * (1 + trend));

    const totalRevenue6M = revenues.reduce((a, b) => a + b, 0);
    const avgMonthly = Math.round(totalRevenue6M / 6);

    return {
      success: true as const,
      data: data.map(d => ({ ...d, pct: Math.round((d.revenue / maxRevenue) * 100) })),
      prediction,
      totalRevenue6M,
      avgMonthly,
      trendPct: Math.round(trendRaw * 100),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function getDashboardMetrics(month?: number, year?: number) {
  try {
    const secureDb = await getSecurePrisma();

    // Default to current month/year if not provided
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Fetch all metrics concurrently using Promise.all for maximum performance
    const [
      paidBillsAggregation,
      unpaidBillsAggregation,
      totalProperties,
      totalRooms,
      occupiedRooms
    ] = await Promise.all([
      // 1. Total Revenue (PAID bills)
      secureDb.bill.aggregate({
        where: {
          month: currentMonth,
          year: currentYear,
          status: "PAID"
        },
        _sum: { totalAmount: true }
      }),
      // 2. Outstanding Debt (UNPAID, OVERDUE, or PENDING bills)
      secureDb.bill.aggregate({
        where: {
          month: currentMonth,
          year: currentYear,
          status: { in: ["UNPAID", "OVERDUE", "PENDING"] }
        },
        _sum: { totalAmount: true }
      }),
      // 3. Occupancy Rate & Properties
      secureDb.property.count(),
      secureDb.room.count(),
      secureDb.room.count({ where: { status: "OCCUPIED" } })
    ]);

    const totalRevenue = paidBillsAggregation._sum.totalAmount || 0;
    const outstandingDebt = unpaidBillsAggregation._sum.totalAmount || 0;

    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    return {
      success: true,
      data: {
        currentMonth,
        currentYear,
        totalProperties,
        totalRevenue,
        outstandingDebt,
        totalRooms,
        occupiedRooms,
        occupancyRate: Math.round(occupancyRate * 100) / 100 // Round to 2 decimal places
      }
    };

  } catch (error: any) {
    console.error("Failed to fetch dashboard metrics:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch dashboard metrics"
    };
  }
}
