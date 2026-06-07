"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

/**
 * Calculates the previous meter reading for a room dynamically by summing all
 * billing units prior to the target billing month/year, starting from the room's
 * initial meter values.
 */
async function getPreviousMeterReading(
  roomId: string,
  type: "WATER" | "ELECTRIC",
  targetMonth: number,
  targetYear: number
): Promise<number> {
  const secureDb = await getSecurePrisma();
  
  // Fetch initial starting meter value configured on the room
  const room = await secureDb.room.findUnique({
    where: { id: roomId },
    select: { waterMeterStart: true, electricMeterStart: true }
  });
  
  const startVal = type === "WATER" ? (room?.waterMeterStart || 0) : (room?.electricMeterStart || 0);
  
  // Sum units from all previous bills of this room
  const previousBills = await secureDb.bill.findMany({
    where: {
      roomId,
      isDeleted: false,
      OR: [
        { year: { lt: targetYear } },
        { year: targetYear, month: { lt: targetMonth } }
      ]
    },
    select: {
      waterUnits: true,
      electricUnits: true
    }
  });
  
  const sumUnits = previousBills.reduce((sum, b) => {
    const units = type === "WATER" ? (b.waterUnits || 0) : (b.electricUnits || 0);
    return sum + units;
  }, 0);
  
  return startVal + sumUnits;
}

/**
 * Loads occupied rooms in a property, calculating the previous meter reading
 * and retrieving the current reading input if a draft bill already exists.
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
        if (bill) {
          const units = type === "ELECTRIC" ? bill.electricUnits : bill.waterUnits;
          if (units !== null && units !== undefined) {
            currentReadingInput = (previousReading + units).toString();
          }
        }

        return {
          roomId: room.id,
          roomNumber: room.number,
          previousReading,
          currentReadingInput
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
 * Saves entered readings. Dynamically generates bills if they do not exist,
 * or updates existing bills. Implements double-checking against negative utility units.
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

    // 1. Fetch Property details (rates and default fees)
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "ไม่พบข้อมูลหอพัก หรือไม่มีสิทธิ์เข้าถึง" };
    }

    const rate = type === "ELECTRIC" ? (property.electricRate || 0) : (property.waterRate || 0);
    const commonFee = property.defaultCommonFee || 0;
    const parkingFee = property.defaultParkingFee || 0;
    const internetFee = property.defaultInternetFee || 0;

    // 2. Perform updates/inserts
    const promises = updates.map(async (update) => {
      const { roomId, currentReading } = update;

      const previousReading = await getPreviousMeterReading(roomId, type, month, year);
      
      if (currentReading < previousReading) {
        const roomInfo = await secureDb.room.findUnique({
          where: { id: roomId },
          select: { number: true }
        });
        throw new Error(
          `ห้อง ${roomInfo?.number || roomId}: เลขมิเตอร์ปัจจุบัน (${currentReading}) ห้ามมีค่าน้อยกว่าเดือนก่อนหน้า (${previousReading})`
        );
      }

      const unitsUsed = currentReading - previousReading;
      const amount = unitsUsed * rate;

      // Check if bill exists
      const existingBill = await secureDb.bill.findUnique({
        where: {
          roomId_month_year: {
            roomId,
            month,
            year
          }
        }
      });

      if (existingBill) {
        const rentAmount = existingBill.rentAmount;
        
        let newWaterUnits = existingBill.waterUnits;
        let newWaterAmount = existingBill.waterAmount;
        let newElectricUnits = existingBill.electricUnits;
        let newElectricAmount = existingBill.electricAmount;

        if (type === "WATER") {
          newWaterUnits = unitsUsed;
          newWaterAmount = amount;
        } else {
          newElectricUnits = unitsUsed;
          newElectricAmount = amount;
        }

        const newTotalAmount =
          rentAmount +
          newWaterAmount +
          newElectricAmount +
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
            electricUnits: newElectricUnits,
            electricAmount: newElectricAmount,
            totalAmount: newTotalAmount
          }
        });
      } else {
        // Fetch room rentPrice
        const room = await secureDb.room.findUnique({
          where: { id: roomId }
        });
        if (!room) {
          throw new Error(`ไม่พบห้องพักรหัส ${roomId}`);
        }

        const rentAmount = room.rentPrice || 0;
        let waterUnits = null;
        let waterAmount = 0;
        let electricUnits = null;
        let electricAmount = 0;

        if (type === "WATER") {
          waterUnits = unitsUsed;
          waterAmount = amount;
        } else {
          electricUnits = unitsUsed;
          electricAmount = amount;
        }

        const totalAmount =
          rentAmount +
          waterAmount +
          electricAmount +
          commonFee +
          parkingFee +
          internetFee;

        // Default due date: 5th of the next month
        const dueDate = new Date(year, month, 5);

        return secureDb.bill.create({
          data: {
            roomId,
            month,
            year,
            rentAmount,
            waterUnits,
            waterAmount,
            electricUnits,
            electricAmount,
            commonFee,
            parkingFee,
            internetFee,
            otherFee: 0,
            totalAmount,
            status: "UNPAID",
            dueDate
          }
        });
      }
    });

    // Run updates in Promise.all
    await Promise.all(promises);

    return { success: true, message: `บันทึกมิเตอร์สำเร็จเรียบร้อยแล้ว!` };
  } catch (error: any) {
    console.error("saveBulkMeters error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}
