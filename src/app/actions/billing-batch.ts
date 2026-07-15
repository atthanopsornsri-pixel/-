"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

/**
 * PHASE 7: Batch Operations (Bulk Generate)
 * Quickly generate draft bills for all occupied rooms in a property.
 */
export async function generateBulkBills(propertyId: string, month: number, year: number) {
  try {
    const secureDb = await getSecurePrisma();

    // 1. Fetch Property to get default fees and ensure it belongs to the Owner
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "Property not found or unauthorized." };
    }

    // 2. Fetch all Rooms in this property that are OCCUPIED
    const rooms = await secureDb.room.findMany({
      where: {
        propertyId,
        status: "OCCUPIED"
      }
    });

    if (rooms.length === 0) {
      return { success: false, error: "No occupied rooms found in this property." };
    }

    // 3. Find existing bills to prevent duplicates (Phase 4 double-billing check)
    const roomIds = rooms.map(r => r.id);
    const existingBills = await secureDb.bill.findMany({
      where: {
        roomId: { in: roomIds },
        month,
        year
      },
      select: { roomId: true }
    });

    const existingRoomIds = new Set(existingBills.map(b => b.roomId));

    // 4. Filter out rooms that already have a bill
    const roomsToBill = rooms.filter(r => !existingRoomIds.has(r.id));

    if (roomsToBill.length === 0) {
      return { success: true, count: 0, message: "All occupied rooms already have bills for this month." };
    }

    // Default due date: 5th of the next month
    const dueDate = new Date(year, month, 5);

    // ผู้เช่าปัจจุบันของแต่ละห้อง — ผูก tenantId กับบิล (ประวัติไม่ปนกับผู้เช่าคนถัดไป)
    const activeTenants = await secureDb.tenant.findMany({
      where: { roomId: { in: roomsToBill.map(r => r.id) }, isDeleted: false },
      select: { id: true, roomId: true },
    });
    const tenantByRoom = new Map(activeTenants.map(t => [t.roomId, t.id]));

    // 5. Prepare bulk data payload
    const newBillsData = roomsToBill.map(room => {
      const rentAmount = room.rentPrice || 0;
      const commonFee = property.defaultCommonFee || 0;
      const parkingFee = property.defaultParkingFee || 0;
      const internetFee = property.defaultInternetFee || 0;
      const otherFee = 0;
      const totalAmount = rentAmount + commonFee + parkingFee + internetFee + otherFee;

      return {
        month,
        year,
        roomId: room.id,
        tenantId: tenantByRoom.get(room.id) ?? null,
        rentAmount,
        waterAmount: 0, // Will be updated in Data Grid
        electricAmount: 0, // Will be updated in Data Grid
        commonFee,
        parkingFee,
        internetFee,
        otherFee,
        totalAmount,
        status: "UNPAID" as const, // Draft state waiting for meter updates
        dueDate
      };
    });

    // 6. Execute Bulk Insert (Extremely fast)
    // NOTE: getSecurePrisma() intercepts this automatically to apply tenant isolation if needed,
    // though createMany is usually raw, the owner validation already occurred on the property/rooms fetch.
    const result = await secureDb.bill.createMany({
      data: newBillsData,
      skipDuplicates: true // Extra safety net
    });

    return { 
      success: true, 
      count: result.count, 
      message: `Successfully generated ${result.count} bills.` 
    };

  } catch (error: any) {
    console.error("Bulk Generation Error:", error);
    return { success: false, error: "Failed to generate bulk bills." };
  }
}

/**
 * PHASE 7: Batch Operations (Bulk Update Meters)
 * Update meters for multiple bills in a single database transaction.
 */
export async function updateBulkMeters(
  propertyId: string,
  updates: { billId: string, waterUnit: number, electricUnit: number }[]
) {
  if (!updates || updates.length === 0) {
    return { success: false, error: "No updates provided." };
  }

  try {
    const secureDb = await getSecurePrisma();

    // 1. Get Property utility rates securely
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "Property not found." };
    }

    const waterRate = property.waterRate || 0;
    const electricRate = property.electricRate || 0;

    // 2. We use Prisma's $transaction to process an array of independent updates safely.
    // If one fails, they all fail (ACID compliance).
    // Note: getSecurePrisma intercepts each of these updates to ensure the bills belong to the owner!
    
    // We must fetch the existing bills first to calculate the correct new totalAmount
    const billIds = updates.map(u => u.billId);
    const existingBills = await secureDb.bill.findMany({
      where: { id: { in: billIds } }
    });

    const billMap = new Map(existingBills.map(b => [b.id, b]));

    const transactionPromises = updates.map(update => {
      const bill = billMap.get(update.billId);
      if (!bill) {
        throw new Error(`Bill ${update.billId} not found or unauthorized.`);
      }

      if (update.waterUnit < 0 || update.electricUnit < 0) {
        throw new Error(`หน่วยน้ำหรือไฟในห้อง ${bill.roomId} ห้ามติดลบ`);
      }

      // Calculate new amounts
      const newWaterAmount = update.waterUnit * waterRate;
      const newElectricAmount = update.electricUnit * electricRate;

      // Calculate new total
      const newTotalAmount = 
        bill.rentAmount + 
        newWaterAmount + 
        newElectricAmount + 
        bill.commonFee + 
        bill.parkingFee + 
        bill.internetFee + 
        bill.otherFee;

      // Execute secure update
      return secureDb.bill.update({
        where: { id: update.billId },
        data: {
          waterUnits: update.waterUnit,
          waterAmount: newWaterAmount,
          electricUnits: update.electricUnit,
          electricAmount: newElectricAmount,
          totalAmount: newTotalAmount
        }
      });
    });

    // 3. Fire the transaction! (All or nothing)
    const results = await secureDb.$transaction(transactionPromises);

    return { 
      success: true, 
      count: results.length,
      message: `Successfully updated ${results.length} meter readings.` 
    };

  } catch (error: any) {
    console.error("Bulk Meter Update Error:", error);
    return { success: false, error: error.message || "Failed to update bulk meters." };
  }
}
