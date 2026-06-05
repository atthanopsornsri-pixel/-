"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";
import { revalidatePath } from "next/cache";

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

    // Parse CSV safely
    const csvText = await file.text();
    const rows = csvText.split(/\r?\n/).filter(r => r.trim().length > 0);
    
    // Assume first row is header, skip it
    const dataRows = rows.slice(1);
    
    let importedCount = 0;

    // Use a transaction for bulk inserts to ensure atomic rollback if catastrophic failure occurs
    // However, since we want to skip/update, we will loop sequentially inside the transaction
    await secureDb.$transaction(async (tx) => {
      for (const row of dataRows) {
        // Simple CSV parse handling potential spaces
        const [roomNumber, rentPriceStr, tenantName, tenantPhone] = row.split(",").map(s => s.trim());
        
        if (!roomNumber) continue;

        const rentPrice = parseFloat(rentPriceStr) || 0;

        // 1. Create or Update Room
        let room = await tx.room.findFirst({
          where: {
            propertyId: propertyId,
            number: roomNumber
          }
        });

        if (room) {
          room = await tx.room.update({
            where: { id: room.id },
            data: {
              rentPrice: rentPrice,
              status: tenantName && tenantPhone ? "OCCUPIED" : "AVAILABLE"
            }
          });
        } else {
          room = await tx.room.create({
            data: {
              propertyId: propertyId,
              number: roomNumber,
              rentPrice: rentPrice,
              status: tenantName && tenantPhone ? "OCCUPIED" : "AVAILABLE"
            }
          });
        }

        // 2. Create Tenant if provided
        if (tenantName && tenantPhone) {
          // Check if a user with this phone exists (as we mapped phone to user earlier, 
          // wait, our Tenant schema has `phoneNumber` and `name` is on User schema.)
          // Actually, our previous schema was:
          // User: name, email, phone (no phone in User), role
          // Tenant: userId, roomId, phoneNumber
          // To create a Tenant, we need a User record first.
          
          let user = await tx.user.findFirst({
            where: { 
              // Create a unique dummy email/username based on phone
              username: tenantPhone 
            }
          });

          if (!user) {
            user = await tx.user.create({
              data: {
                name: tenantName,
                username: tenantPhone,
                email: `${tenantPhone}@apartment-os.local`, // dummy email
                role: "TENANT",
                // password can be null if relying on LINE login later
              }
            });
          }

          // Create or update Tenant record
          await tx.tenant.upsert({
            where: { phoneNumber: tenantPhone },
            update: {
              roomId: room.id,
              userId: user.id
            },
            create: {
              phoneNumber: tenantPhone,
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
