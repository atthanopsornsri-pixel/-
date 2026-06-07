"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

/**
 * Calculates the previous meter reading for a room dynamically by fetching
 * the single most recent bill with a recorded reading before the target month/year.
 * This is an O(1) indexed query, avoiding scaling bottlenecks.
 */
async function getPreviousMeterReading(
  roomId: string,
  type: "WATER" | "ELECTRIC",
  targetMonth: number,
  targetYear: number
): Promise<number> {
  const secureDb = await getSecurePrisma();

  const readingField = type === "WATER" ? "waterReading" : "electricReading";

  // Find the single most recent bill prior to the target month/year with a recorded reading
  const lastBill = await secureDb.bill.findFirst({
    where: {
      roomId,
      isDeleted: false,
      [readingField]: { not: null },
      OR: [
        { year: { lt: targetYear } },
        { year: targetYear, month: { lt: targetMonth } }
      ]
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ],
    select: {
      waterReading: true,
      electricReading: true
    }
  });

  if (lastBill) {
    const lastReading = type === "WATER" ? lastBill.waterReading : lastBill.electricReading;
    if (lastReading !== null && lastReading !== undefined) {
      return lastReading;
    }
  }

  // Fallback to initial starting meter value configured on the room
  const room = await secureDb.room.findUnique({
    where: { id: roomId },
    select: { waterMeterStart: true, electricMeterStart: true }
  });

  return type === "WATER" ? (room?.waterMeterStart || 0) : (room?.electricMeterStart || 0);
}

/**
 * Loads occupied rooms in a property, calculating the previous meter reading
 * and retrieving the current reading input if a bill already exists.
 * Sets hasBill to false if no bill exists, preventing ghost bills.
 */
export async function getRoomsForMeterEntry(
  propertyId: string,
  month: number,
  year: number,
  type: "WATER" | "ELECTRIC"
) {
  try {
    const secureDb = await getSecurePrisma();

    // 1. Fetch Property details to get utility rates
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "ไม่พบข้อมูลหอพัก หรือไม่มีสิทธิ์เข้าถึง" };
    }

    const ratePerUnit = type === "ELECTRIC" ? (property.electricRate || 0) : (property.waterRate || 0);

    // 2. Fetch occupied rooms in property
    const rooms = await secureDb.room.findMany({
      where: {
        propertyId,
        status: "OCCUPIED",
        isDeleted: false
      },
      orderBy: {
        number: "asc"
      }
    });

    // 3. For each room, calculate previous reading and check if bill exists
    const rows = await Promise.all(
      rooms.map(async (room) => {
        const previousReading = await getPreviousMeterReading(room.id, type, month, year);

        // Fetch bill for current month/year
        const bill = await secureDb.bill.findUnique({
          where: {
            roomId_month_year: {
              roomId: room.id,
              month,
              year
            }
          }
        });

        let currentReadingInput = "";
        let hasBill = false;

        if (bill) {
          hasBill = true;
          const reading = type === "ELECTRIC" ? bill.electricReading : bill.waterReading;
          if (reading !== null && reading !== undefined) {
            currentReadingInput = reading.toString();
          }
        }

        return {
          roomId: room.id,
          roomNumber: room.number,
          previousReading,
          currentReadingInput,
          hasBill
        };
      })
    );

    return {
      success: true,
      ratePerUnit,
      rows
    };
  } catch (error: any) {
    console.error("getRoomsForMeterEntry error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลห้องพัก" };
  }
}

/**
 * Saves entered readings. Updates only existing bills. Throws error if a bill does not
 * exist to prevent ghost bills. Saves both calculated units and absolute readings.
 */
export async function saveBulkMeters(
  propertyId: string,
  month: number,
  year: number,
  type: "WATER" | "ELECTRIC",
  updates: { roomId: string; currentReading: number }[]
) {
  if (updates.length === 0) {
    return { success: false, error: "ไม่มีข้อมูลสำหรับบันทึก" };
  }

  try {
    const secureDb = await getSecurePrisma();

    // 1. Fetch Property details (rates)
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "ไม่พบข้อมูลหอพัก หรือไม่มีสิทธิ์เข้าถึง" };
    }

    const rate = type === "ELECTRIC" ? (property.electricRate || 0) : (property.waterRate || 0);

    // 2. Perform updates
    const promises = updates.map(async (update) => {
      const { roomId, currentReading } = update;

      // Check if bill exists
      const existingBill = await secureDb.bill.findUnique({
        where: {
          roomId_month_year: {
            roomId,
            month,
            year
          }
        },
        include: {
          room: true
        }
      });

      if (!existingBill) {
        throw new Error(
          `ไม่พบรอบบิลสำหรับห้อง ${roomId} ในเดือนนี้ กรุณาเปิดรอบบิลก่อนบันทึกมิเตอร์`
        );
      }

      const previousReading = await getPreviousMeterReading(roomId, type, month, year);
      
      if (currentReading < previousReading) {
        throw new Error(
          `ห้อง ${existingBill.room.number}: เลขมิเตอร์ปัจจุบัน (${currentReading}) ห้ามมีค่าน้อยกว่าเดือนก่อนหน้า (${previousReading})`
        );
      }

      const unitsUsed = currentReading - previousReading;
      const amount = unitsUsed * rate;

      const rentAmount = existingBill.rentAmount;
      
      let newWaterUnits = existingBill.waterUnits;
      let newWaterAmount = existingBill.waterAmount;
      let newWaterReading = existingBill.waterReading;
      let newElectricUnits = existingBill.electricUnits;
      let newElectricAmount = existingBill.electricAmount;
      let newElectricReading = existingBill.electricReading;

      if (type === "WATER") {
        newWaterUnits = unitsUsed;
        newWaterAmount = amount;
        newWaterReading = currentReading;
      } else {
        newElectricUnits = unitsUsed;
        newElectricAmount = amount;
        newElectricReading = currentReading;
      }

      const newTotalAmount =
        rentAmount +
        (newWaterAmount || 0) +
        (newElectricAmount || 0) +
        existingBill.commonFee +
        existingBill.parkingFee +
        existingBill.internetFee +
        existingBill.otherFee +
        existingBill.balanceForward;

      return secureDb.bill.update({
        where: { id: existingBill.id },
        data: {
          waterUnits: newWaterUnits,
          waterAmount: newWaterAmount,
          waterReading: newWaterReading,
          electricUnits: newElectricUnits,
          electricAmount: newElectricAmount,
          electricReading: newElectricReading,
          totalAmount: newTotalAmount
        }
      });
    });

    // Run updates in Promise.all
    await Promise.all(promises);

    return { success: true, message: `บันทึกมิเตอร์สำเร็จเรียบร้อยแล้ว!` };
  } catch (error: any) {
    console.error("saveBulkMeters error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}
