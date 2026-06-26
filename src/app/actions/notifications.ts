"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * 🔔 ดึงรายการแจ้งเตือนของตนเอง (จำกัดล่าสุด 30 รายการเพื่อประสิทธิภาพ)
 */
export async function getNotifications() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return { success: true, notifications };
  } catch (error: any) {
    console.error("getNotifications error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลแจ้งเตือน" };
  }
}

/**
 * 🔔 อ่านข้อความแจ้งเตือนทีละข้อความ (ใช้ updateMany กรองด้วย userId ป้องกัน IDOR)
 */
export async function markNotificationAsRead(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // บังคับกรองด้วย userId เสมอ เพื่อไม่ให้แก้ไขของผู้อื่นได้
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    if (result.count === 0) {
      return { success: false, error: "ไม่พบรายการแจ้งเตือน หรือไม่มีสิทธิ์เข้าถึง" };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("markNotificationAsRead error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาด" };
  }
}

/**
 * 🔔 อ่านข้อความแจ้งเตือนทั้งหมด
 */
export async function markAllNotificationsAsRead() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("markAllNotificationsAsRead error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาด" };
  }
}

/**
 * 🔔 ฟังก์ชันผู้ช่วยหลักสำหรับสร้างการแจ้งเตือนลงฐานข้อมูลแบบทนทาน (try-catch ห่อหุ้ม)
 * ป้องกันไม่ให้การแจ้งเตือนล้มเหลวไปบล็อกการทำรายการหลัก (เช่น การจ่ายเงิน/ออกบิล/แจ้งซ่อม)
 */
export async function createDbNotification(userId: string, title: string, message: string, type: string) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
    return { success: true, notification };
  } catch (error: any) {
    console.error("createDbNotification error (main flow NOT interrupted):", error);
    return { success: false, error: error.message || "Failed to create notification" };
  }
}
