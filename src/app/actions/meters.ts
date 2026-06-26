"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { revalidatePath } from "next/cache";

// ฟังก์ชันผู้ช่วย: คำนวณหาเดือนและปีดั้งเดิมก่อนหน้าแบบระบุตรงตัว (O(1) Direct Pointer)
function getPreviousPeriod(month: number, year: number) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
}

/**
 * 🛠️ ด่านที่ 1: โหลดรายชื่อห้องพักพร้อมค่ามิเตอร์เดือนก่อนหน้าแบบประสิทธิภาพสูง (O(1) Direct Pointer)
 */
export async function getOccupiedRoomsForMeterEntry(
  propertyId: string,
  month: number,
  year: number,
  type: "WATER" | "ELECTRIC"
) {
  const prisma = await getSecurePrisma();
  
  // 1. ดึงข้อมูลห้องพักเฉพาะที่ "มีผู้เช่าอยู่จริง" (Occupied) เพื่อป้องกันการกรอกมั่ว
  const rooms = await prisma.room.findMany({
    where: {
      propertyId: propertyId,
      status: "OCCUPIED",
      isDeleted: false,
    },
    orderBy: { number: "asc" }, // ในโมเดลจริงคือ number
  });

  // หาช่วงเวลาของเดือนก่อนหน้าตรงๆ ไม่ใช้การ Sum ประวัติเก่าทั้งหมด
  const prevPeriod = getPreviousPeriod(month, year);

  const calculatedRows = await Promise.all(
    rooms.map(async (room) => {
      // คิวรีตรงไปยังบิลเดือนก่อนหน้าแค่ 1 แถวข้อมูล (ความเร็วระดับ Milliseconds ด้วย Index)
      // ต้องกรอง type: "MONTHLY" เสมอ เพื่อไม่หยิบ CHECKIN bill มาใช้
      const lastMonthBill = await prisma.bill.findFirst({
        where: {
          roomId: room.id,
          month: prevPeriod.month,
          year: prevPeriod.year,
          type: "MONTHLY",
          isDeleted: false,
        },
        select: {
          waterReading: true,
          electricReading: true,
        },
      });

      // ตรรกะ Fallback: ถ้ามีบิลเดือนก่อน ให้ใช้เลขท้ายบิลนั้น ถ้าไม่มี ให้ถอยไปใช้เลขตั้งต้นวันย้ายเข้า
      let previousReading = 0;
      if (type === "ELECTRIC") {
        previousReading = lastMonthBill?.electricReading ?? room.electricMeterStart ?? 0;
      } else {
        previousReading = lastMonthBill?.waterReading ?? room.waterMeterStart ?? 0;
      }

      return {
        roomId: room.id,
        roomNumber: room.number,
        previousReading: previousReading,
        currentReadingInput: "", // เตรียมช่องว่างไว้ให้หน้าบ้านกรอก
      };
    })
  );

  return calculatedRows;
}

/**
 * 🛠️ ด่านที่ 2: บันทึกข้อมูลมิเตอร์แบบ Bulk ป้องกันบิลผีระบาด
 */
export async function saveBulkMeterReadings(
  propertyId: string,
  month: number,
  year: number,
  type: "WATER" | "ELECTRIC",
  readings: { roomId: string; currentReading: number }[]
) {
  const prisma = await getSecurePrisma();

  // ดึงอัตราค่าน้ำค่าไฟมาตรฐานของตึกนี้มาคำนวณเงิน
  const propertySetting = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { waterRate: true, electricRate: true },
  });

  if (!propertySetting) throw new Error("ไม่พบข้อมูลการตั้งค่าอัตราค่าน้ำไฟของอาคารนี้");
  const currentRate = type === "ELECTRIC" ? (propertySetting.electricRate || 0) : (propertySetting.waterRate || 0);

  // รันธุรกรรมแบบเป็นกลุ่ม (Database Transaction) เพื่อความปลอดภัยของข้อมูล
  await prisma.$transaction(async (tx) => {
    const prevPeriod = getPreviousPeriod(month, year);

    for (const reading of readings) {
      const room = await tx.room.findUnique({
        where: { id: reading.roomId },
        select: { number: true, waterMeterStart: true, electricMeterStart: true }
      });
      if (!room) throw new Error(`ไม่พบห้องพัก ${reading.roomId}`);

      // กรอง type: "MONTHLY" เพื่อไม่หยิบ CHECKIN bill มาเป็น previousReading
      const lastMonthBill = await tx.bill.findFirst({
        where: {
          roomId: reading.roomId,
          month: prevPeriod.month,
          year: prevPeriod.year,
          type: "MONTHLY",
          isDeleted: false,
        },
        select: {
          waterReading: true,
          electricReading: true,
        },
      });

      let previousReading = 0;
      if (type === "ELECTRIC") {
        previousReading = lastMonthBill?.electricReading ?? room.electricMeterStart ?? 0;
      } else {
        previousReading = lastMonthBill?.waterReading ?? room.waterMeterStart ?? 0;
      }

      if (reading.currentReading < previousReading) {
        throw new Error(
          `ห้อง ${room.number}: เลขมิเตอร์ปัจจุบัน (${reading.currentReading}) ห้ามมีค่าน้อยกว่าเดือนก่อนหน้า (${previousReading})`
        );
      }

      const unitsUsed = Math.max(0, reading.currentReading - previousReading);
      const amount = unitsUsed * currentRate;

      // ค้นหาบิลรอบปัจจุบัน
      // ใช้ findFirst (ไม่ใช่ composite key) เพราะ getSecurePrisma แปลง findUnique → findFirst
      // unique constraint [roomId,month,year,type] รับประกันว่ามีบิลเดียวอยู่แล้ว
      const existingBill = await tx.bill.findFirst({
        where: {
          roomId: reading.roomId,
          month: month,
          year: year,
          type: "MONTHLY",
        },
      });

      if (existingBill) {
        // อัปเดตบิลเดิมที่มีอยู่
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
          newWaterReading = reading.currentReading;
        } else {
          newElectricUnits = unitsUsed;
          newElectricAmount = amount;
          newElectricReading = reading.currentReading;
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

        await tx.bill.update({
          where: { id: existingBill.id },
          data: {
            waterUnits: newWaterUnits,
            waterAmount: newWaterAmount,
            waterReading: newWaterReading,
            electricUnits: newElectricUnits,
            electricAmount: newElectricAmount,
            electricReading: newElectricReading,
            totalAmount: newTotalAmount,
          },
        });
      } else {
        // สร้างบิลใหม่เป็น Draft/Unpaid โดยตั้งค่าเช่าห้องเริ่มต้นเป็น 0 ป้องกันบิลผี
        const waterUnitsVal = type === "WATER" ? unitsUsed : 0;
        const waterAmountVal = type === "WATER" ? amount : 0;
        const waterReadingVal = type === "WATER" ? reading.currentReading : room.waterMeterStart ?? 0;

        const electricUnitsVal = type === "ELECTRIC" ? unitsUsed : 0;
        const electricAmountVal = type === "ELECTRIC" ? amount : 0;
        const electricReadingVal = type === "ELECTRIC" ? reading.currentReading : room.electricMeterStart ?? 0;

        // คำนวณวันครบกำหนด (7 วันถัดไป)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        await tx.bill.create({
          data: {
            roomId: reading.roomId,
            month: month,
            year: year,
            type: "MONTHLY", // ระบุ explicit ป้องกัน default เปลี่ยน
            status: "UNPAID",
            rentAmount: 0, // สลักเป็น 0 ตามที่บอสต้องการ
            waterUnits: waterUnitsVal,
            waterAmount: waterAmountVal,
            waterReading: waterReadingVal,
            electricUnits: electricUnitsVal,
            electricAmount: electricAmountVal,
            electricReading: electricReadingVal,
            totalAmount: amount,
            dueDate: dueDate,
          },
        });
      }
    }
  });

  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/meters");

  return { success: true };
}

/**
 * 🛠️ ฟังก์ชันเวอร์ชันเดิม (Compatibility Layer) เพื่อไม่ให้หน้าบ้าน (Meters Page) พัง
 */
export async function getRoomsForMeterEntry(
  propertyId: string,
  month: number,
  year: number,
  type: "WATER" | "ELECTRIC"
) {
  try {
    const prisma = await getSecurePrisma();
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "ไม่พบข้อมูลหอพัก หรือไม่มีสิทธิ์เข้าถึง" };
    }

    const ratePerUnit = type === "ELECTRIC" ? (property.electricRate || 0) : (property.waterRate || 0);

    const rows = await getOccupiedRoomsForMeterEntry(propertyId, month, year, type);

    // ดึงค่าสถานะรอบบิลปัจจุบันเพื่อผูกเข้ากับ row
    const rowsWithBillStatus = await Promise.all(
      rows.map(async (row) => {
        // findFirst + flat where (getSecurePrisma แปลง findUnique → findFirst)
        const bill = await prisma.bill.findFirst({
          where: {
            roomId: row.roomId,
            month,
            year,
            type: "MONTHLY",
          },
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
          ...row,
          currentReadingInput,
          hasBill,
        };
      })
    );

    return {
      success: true,
      ratePerUnit,
      rows: rowsWithBillStatus,
    };
  } catch (error: any) {
    console.error("getRoomsForMeterEntry error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล" };
  }
}

// ─────────────────────────────────────────────
// NEW: โหลดมิเตอร์ไฟ + น้ำ พร้อมกันในแถวเดียว
// ─────────────────────────────────────────────
export async function getRoomsBothMeters(
  propertyId: string,
  month: number,
  year: number
) {
  try {
    const prisma = await getSecurePrisma();
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { electricRate: true, waterRate: true },
    });
    if (!property) return { success: false, error: "ไม่พบข้อมูลหอพัก" };

    const rooms = await prisma.room.findMany({
      where: { propertyId, status: "OCCUPIED", isDeleted: false },
      orderBy: { number: "asc" },
    });

    const prevPeriod = getPreviousPeriod(month, year);

    const rows = await Promise.all(
      rooms.map(async (room) => {
        const prevBill = await prisma.bill.findFirst({
          where: { roomId: room.id, month: prevPeriod.month, year: prevPeriod.year, type: "MONTHLY", isDeleted: false },
          select: { waterReading: true, electricReading: true },
        });
        const currBill = await prisma.bill.findFirst({
          where: { roomId: room.id, month, year, type: "MONTHLY" },
          select: { electricReading: true, waterReading: true },
        });
        return {
          roomId: room.id,
          roomNumber: room.number,
          hasBill: !!currBill,
          prevElectric: prevBill?.electricReading ?? room.electricMeterStart ?? 0,
          electricInput: currBill?.electricReading != null ? String(currBill.electricReading) : "",
          prevWater: prevBill?.waterReading ?? room.waterMeterStart ?? 0,
          waterInput: currBill?.waterReading != null ? String(currBill.waterReading) : "",
        };
      })
    );

    return {
      success: true,
      rows,
      electricRate: property.electricRate ?? 0,
      waterRate: property.waterRate ?? 0,
    };
  } catch (error: any) {
    console.error("getRoomsBothMeters error:", error);
    return { success: false, error: error.message };
  }
}

// NEW: บันทึกมิเตอร์ทั้งไฟและน้ำในคราวเดียว
export async function saveBothMeters(
  propertyId: string,
  month: number,
  year: number,
  updates: { roomId: string; electricReading?: number; waterReading?: number }[]
) {
  try {
    const electricUpdates = updates.filter((u) => u.electricReading !== undefined);
    const waterUpdates    = updates.filter((u) => u.waterReading    !== undefined);

    if (electricUpdates.length > 0) {
      await saveBulkMeterReadings(
        propertyId, month, year, "ELECTRIC",
        electricUpdates.map((u) => ({ roomId: u.roomId, currentReading: u.electricReading! }))
      );
    }
    if (waterUpdates.length > 0) {
      await saveBulkMeterReadings(
        propertyId, month, year, "WATER",
        waterUpdates.map((u) => ({ roomId: u.roomId, currentReading: u.waterReading! }))
      );
    }
    return { success: true, message: "บันทึกมิเตอร์สำเร็จ!" };
  } catch (error: any) {
    console.error("saveBothMeters error:", error);
    return { success: false, error: error.message };
  }
}

export async function saveBulkMeters(
  propertyId: string,
  month: number,
  year: number,
  type: "WATER" | "ELECTRIC",
  updates: { roomId: string; currentReading: number }[]
) {
  try {
    const res = await saveBulkMeterReadings(propertyId, month, year, type, updates);
    return { success: res.success, message: "บันทึกมิเตอร์สำเร็จเรียบร้อยแล้ว!" };
  } catch (error: any) {
    console.error("saveBulkMeters error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

/**
 * 🛠️ ดึงประวัติการจดมิเตอร์ย้อนหลังของอาคารแบบปลอดภัย
 */
export async function getMeterHistory(propertyId: string) {
  try {
    const prisma = await getSecurePrisma();

    // 1. Scoping validation using findFirst on secure prisma (RLS active) to prevent IDOR
    const property = await prisma.property.findFirst({
      where: { id: propertyId },
      select: { id: true }
    });

    if (!property) {
      return { success: false, error: "ไม่พบข้อมูลหอพัก หรือไม่มีสิทธิ์เข้าถึง" };
    }

    // 2. Query all MONTHLY bills with meter readings for this property
    const bills = await prisma.bill.findMany({
      where: {
        room: { propertyId },
        type: "MONTHLY",
        isDeleted: false,
        OR: [
          { electricReading: { not: null } },
          { waterReading: { not: null } }
        ]
      },
      select: {
        id: true,
        month: true,
        year: true,
        electricReading: true,
        electricUnits: true,
        electricAmount: true,
        waterReading: true,
        waterUnits: true,
        waterAmount: true,
        room: {
          select: {
            id: true,
            number: true
          }
        }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { room: { number: "asc" } }
      ]
    });

    return {
      success: true as const,
      bills
    };

  } catch (error: any) {
    console.error("getMeterHistory error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการดึงประวัติมิเตอร์" };
  }
}
