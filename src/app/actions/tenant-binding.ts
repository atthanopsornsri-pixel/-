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

    // 3. Look up the NextAuth User record that owns this LINE providerAccountId.
    //    lineUserId is LINE's providerAccountId (e.g. "U1234abc"), NOT the User.id (cuid).
    //    We must query the Account table to get the correct User.id for PDPA recording.
    const lineAccount = await prisma.account.findFirst({
      where: { provider: "line", providerAccountId: lineUserId },
      select: { userId: true }
    });

    // 4. Build transaction: always bind tenant; record PDPA only when we can resolve the User
    const txOps: any[] = [
      prisma.tenant.update({
        where: { id: tenant.id },
        data: { lineUserId }
      }),
    ];

    if (lineAccount) {
      txOps.push(
        prisma.user.update({
          where: { id: lineAccount.userId },
          data: { pdpaAcceptedAt: new Date() }
        })
      );
    }

    await prisma.$transaction(txOps);

    return {
      success: true,
      message: "ผูกบัญชีสำเร็จ! ยินดีต้อนรับเข้าสู่ระบบ"
    };

  } catch (error: any) {
    console.error("Failed to bind tenant account:", error);
    return { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" };
  }
}
