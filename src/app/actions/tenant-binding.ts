"use server";

import { prisma } from "@/lib/prisma";

/**
 * PHASE 9: Account Binding Workflow
 * Binds a LINE User ID to a pre-created Tenant record via Phone Number.
 */
export async function bindTenantAccount(phoneNumber: string, lineUserId: string) {
  try {
    // 1. Search the Tenant table for a match with phoneNumber
    const tenant = await prisma.tenant.findUnique({
      where: { phoneNumber }
    });

    // If NOT found: Return a generic error (Do not leak data)
    if (!tenant) {
      return { 
        success: false, 
        error: "ไม่พบเบอร์โทรศัพท์นี้ในระบบ กรุณาติดต่อเจ้าของหอพักเพื่อลงทะเบียน" 
      };
    }

    // 2. Check if this tenant is already bound to another LINE ID
    if (tenant.lineUserId && tenant.lineUserId !== lineUserId) {
      return { 
        success: false, 
        error: "เบอร์โทรศัพท์นี้ถูกผูกกับบัญชี LINE อื่นไปแล้ว กรุณาติดต่อแอดมิน" 
      };
    }

    // 3. If FOUND: Update the Tenant record with lineUserId
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { lineUserId }
    });

    return { 
      success: true, 
      message: "ผูกบัญชีสำเร็จ! ยินดีต้อนรับเข้าสู่ระบบ" 
    };

  } catch (error: any) {
    console.error("Failed to bind tenant account:", error);
    return { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" };
  }
}
