"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import Papa from "papaparse";

export async function exportBillingData(propertyId: string, month: number, year: number) {
  try {
    const secureDb = await getSecurePrisma();

    // Verify property ownership
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "ไม่พบหอพัก หรือคุณไม่มีสิทธิ์จัดการหอพักนี้" };
    }

    // Fetch Bills for the specified month/year
    const bills = await secureDb.bill.findMany({
      where: {
        roomId: {
          in: (await secureDb.room.findMany({
            where: { propertyId },
            select: { id: true }
          })).map(r => r.id)
        },
        month: month,
        year: year
      },
      include: {
        room: {
          include: {
            tenants: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: {
        room: { number: 'asc' }
      }
    });

    // Format data into a flat array of objects
    const exportData = bills.map(bill => {
      // Typically a room has one active tenant, we just pick the first for the export
      const tenant = bill.room.tenants[0]?.user;
      
      return {
        "หมายเลขห้อง": bill.room.number,
        "ชื่อผู้เช่า": tenant ? tenant.name : "ไม่มีผู้เช่า",
        "เบอร์โทรศัพท์": bill.room.tenants[0]?.phoneNumber || "-",
        "ค่าเช่า": bill.rentAmount,
        "ค่าน้ำ": bill.waterAmount,
        "ค่าไฟ": bill.electricAmount,
        "ค่าส่วนกลาง/อื่นๆ": bill.commonFee + bill.otherFee,
        "ยอดรวมทั้งสิ้น": bill.totalAmount,
        "สถานะการชำระเงิน": bill.status === "PAID" ? "ชำระแล้ว" : (bill.status === "UNPAID" ? "ค้างชำระ" : "รอตรวจสอบ"),
        "วันที่ออกบิล": bill.createdAt.toISOString().split("T")[0]
      };
    });

    if (exportData.length === 0) {
      return { success: false, error: "ไม่พบข้อมูลบิลสำหรับเดือนนี้" };
    }

    // Convert to CSV
    const csvString = Papa.unparse(exportData);
    
    // Prepend UTF-8 BOM so Excel opens it with correct Thai encoding
    const csvWithBOM = "\uFEFF" + csvString;

    return { success: true, data: csvWithBOM };

  } catch (error: any) {
    console.error("CSV Export Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลส่งออก" };
  }
}
