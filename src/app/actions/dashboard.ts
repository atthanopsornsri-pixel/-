"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

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
