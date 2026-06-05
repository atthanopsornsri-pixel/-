"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { z } from "zod";

const RowSchema = z.object({
  RoomNumber: z.string().min(1).trim(),
  RentPrice: z.preprocess((val) => {
    if (typeof val === 'string') {
      const stripped = val.replace(/,/g, '').trim();
      return stripped ? Number(stripped) : 0;
    }
    return Number(val) || 0;
  }, z.number()),
  TenantName: z.string().trim().optional(),
  TenantPhone: z.string().trim().optional(),
});

export async function importRoomsAndTenants(propertyId: string, formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "ไม่พบไฟล์ CSV" };
    }

    const secureDb = await getSecurePrisma();

    // Verify property ownership
    const property = await secureDb.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return { success: false, error: "ไม่พบหอพัก หรือคุณไม่มีสิทธิ์จัดการหอพักนี้" };
    }

    // Parse CSV
    const csvText = await file.text();
    const parsed = Papa.parse(csvText, { 
      header: false, 
      skipEmptyLines: true 
    });

    // In this app, we assume the CSV has no headers or the user might pass headers.
    // If the first row looks like a header (e.g., contains "Room" or "Name"), we skip it.
    let dataRows = parsed.data as string[][];
    if (dataRows.length > 0 && /room|ห้อง/i.test(dataRows[0][0] || '')) {
      dataRows = dataRows.slice(1);
    }
    
    let importedCount = 0;

    await secureDb.$transaction(async (tx) => {
      for (const row of dataRows) {
        // Safely extract at least 4 columns
        const [rawRoom, rawRent, rawTenantName, rawTenantPhone] = row;
        
        // Zod Validation and Preprocessing
        const parsedRow = RowSchema.safeParse({
          RoomNumber: rawRoom || "",
          RentPrice: rawRent || "0",
          TenantName: rawTenantName || "",
          TenantPhone: rawTenantPhone || ""
        });

        if (!parsedRow.success) {
          // Ignore invalid rows or empty room numbers
          continue;
        }

        const { RoomNumber, RentPrice, TenantName, TenantPhone } = parsedRow.data;

        // 1. Upsert Room (Now possible thanks to @@unique([propertyId, number]))
        const room = await tx.room.upsert({
          where: {
            propertyId_number: {
              propertyId: propertyId,
              number: RoomNumber
            }
          },
          update: {
            rentPrice: RentPrice,
            status: TenantName && TenantPhone ? "OCCUPIED" : "AVAILABLE"
          },
          create: {
            propertyId: propertyId,
            number: RoomNumber,
            rentPrice: RentPrice,
            status: TenantName && TenantPhone ? "OCCUPIED" : "AVAILABLE"
          }
        });

        // 2. Upsert Tenant if provided
        if (TenantName && TenantPhone) {
          let user = await tx.user.findFirst({
            where: { username: TenantPhone }
          });

          if (!user) {
            user = await tx.user.create({
              data: {
                name: TenantName,
                username: TenantPhone,
                email: `${TenantPhone}@apartment-os.local`,
                role: "TENANT",
              }
            });
          } else {
             // Optional: Update existing user name if it changed
             await tx.user.update({
               where: { id: user.id },
               data: { name: TenantName }
             });
          }

          await tx.tenant.upsert({
            where: { phoneNumber: TenantPhone },
            update: {
              roomId: room.id,
              userId: user.id
            },
            create: {
              phoneNumber: TenantPhone,
              roomId: room.id,
              userId: user.id
            }
          });
        }
        importedCount++;
      }
    });

    revalidatePath("/dashboard/owner/settings/import");
    revalidatePath("/dashboard/owner");
    
    return { success: true, message: `นำเข้าข้อมูลสำเร็จ ${importedCount} ห้อง` };

  } catch (error: any) {
    console.error("CSV Import Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล โปรดตรวจสอบรูปแบบไฟล์ CSV" };
  }
}
