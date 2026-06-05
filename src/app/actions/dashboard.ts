"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

export async function getDashboardMetrics(month?: number, year?: number) {
  try {
    const secureDb = await getSecurePrisma();

    // Default to current month/year if not provided
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // 1. Total Revenue (PAID bills)
    // We use .aggregate() to let the DB do the heavy math instead of loading all rows into Node.js memory.
    const paidBillsAggregation = await secureDb.bill.aggregate({
      where: {
        month: currentMonth,
        year: currentYear,
        status: "PAID"
      },
      _sum: {
        totalAmount: true
      }
    });
    const totalRevenue = paidBillsAggregation._sum.totalAmount || 0;

    // 2. Outstanding Debt (UNPAID, OVERDUE, or PENDING bills)
    const unpaidBillsAggregation = await secureDb.bill.aggregate({
      where: {
        month: currentMonth,
        year: currentYear,
        status: {
          in: ["UNPAID", "OVERDUE", "PENDING"] 
        }
      },
      _sum: {
        totalAmount: true
      }
    });
    const outstandingDebt = unpaidBillsAggregation._sum.totalAmount || 0;

    // 3. Occupancy Rate & Properties
    // Thanks to getSecurePrisma, this ONLY counts records belonging to this specific OWNER.
    const [totalProperties, totalRooms, occupiedRooms] = await Promise.all([
      secureDb.property.count(),
      secureDb.room.count(),
      secureDb.room.count({
        where: {
          status: "OCCUPIED"
        }
      })
    ]);

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
