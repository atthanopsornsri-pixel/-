"use server";

import { prisma } from "@/lib/prisma";
import { getSecurePrisma } from "@/lib/prisma-secure";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDbNotification } from "./notifications";
import { saveBulkMeterReadings } from "./meters";
import { sendLineOAMessage } from "@/lib/line";
import { revalidatePath } from "next/cache";

// Helper for previous period calculation
function getPreviousPeriod(month: number, year: number) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
}

/**
 * 📝 ลูกบ้านส่งตัวเลขมิเตอร์น้ำ/ไฟ ด้วยตนเอง
 */
export async function submitMeterReading(reading: number, type: "WATER" | "ELECTRIC", photoUrl?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TENANT") {
      return { success: false, error: "Unauthorized: สำหรับลูกบ้านเท่านั้น" };
    }

    const userId = session.user.id;

    // ค้นข้อมูลผู้เช่าและห้องพักจาก session
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: {
        room: {
          include: {
            property: true
          }
        }
      }
    });

    if (!tenant || !tenant.roomId || !tenant.room) {
      return { success: false, error: "ไม่พบข้อมูลห้องพักของผู้เช่ารายนี้" };
    }

    const room = tenant.room;
    const property = room.property;

    // 1. ตรวจว่าหอพักเปิดใช้งานระบบส่งหน่วยมิเตอร์เองหรือไม่
    if (!property.enableTenantReport) {
      return { success: false, error: "หอพักนี้ยังไม่เปิดใช้งานระบบให้ลูกบ้านจดมิเตอร์เอง" };
    }

    // 2. ตรวจช่วงเวลาวันที่ส่งข้อมูล
    const currentDay = new Date().getDate();
    if (currentDay < property.reportStartDay || currentDay > property.reportEndDay) {
      return {
        success: false,
        error: `ระบบเปิดให้จดบันทึกเฉพาะช่วงวันที่ ${property.reportStartDay} ถึง ${property.reportEndDay} ของเดือนเท่านั้น`
      };
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // 1-12
    const year = currentDate.getFullYear();

    // 3. ตรวจสอบสถานะการบันทึกเดิม ป้องกันการทับข้อมูลที่อนุมัติแล้ว
    const existing = await prisma.meterSubmission.findUnique({
      where: {
        roomId_month_year_type: {
          roomId: room.id,
          month,
          year,
          type
        }
      }
    });

    if (existing?.status === "APPROVED") {
      return { success: false, error: "ตัวเลขมิเตอร์ในรอบเดือนนี้ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขได้" };
    }

    // 4. ดึงและคำนวณมิเตอร์ครั้งก่อนหน้า เพื่อตรวจสอบขอบเขตค่าน้อยกว่า
    const prevPeriod = getPreviousPeriod(month, year);
    const lastMonthBill = await prisma.bill.findFirst({
      where: {
        roomId: room.id,
        month: prevPeriod.month,
        year: prevPeriod.year,
        type: "MONTHLY",
        isDeleted: false
      },
      select: {
        waterReading: true,
        electricReading: true
      }
    });

    let previousReading = 0;
    if (type === "ELECTRIC") {
      previousReading = lastMonthBill?.electricReading ?? room.electricMeterStart ?? 0;
    } else {
      previousReading = lastMonthBill?.waterReading ?? room.waterMeterStart ?? 0;
    }

    if (reading < previousReading) {
      return {
        success: false,
        error: `เลขมิเตอร์ที่แจ้ง (${reading}) ห้ามต่ำกว่าเลขหน่วยครั้งก่อนหน้า (${previousReading})`
      };
    }

    // 5. บันทึกข้อมูลแบบ Upsert
    const submission = await prisma.meterSubmission.upsert({
      where: {
        roomId_month_year_type: {
          roomId: room.id,
          month,
          year,
          type
        }
      },
      create: {
        roomId: room.id,
        tenantId: tenant.id,
        month,
        year,
        type,
        reading,
        photoUrl,
        status: "PENDING"
      },
      update: {
        reading,
        photoUrl,
        status: "PENDING", // รีเซ็ตกลับเป็น PENDING ถ้าเคยปฏิเสธ
        note: null // เคลียร์ข้อความปฏิเสธเก่า
      }
    });

    revalidatePath("/dashboard/meters");
    return { success: true, submission };
  } catch (error: any) {
    console.error("submitMeterReading error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

/**
 * 📋 ดึงรายการรอนุมัติประจำหอพัก (ฝั่งเจ้าของ - Scoped manually)
 */
export async function getPendingSubmissions(propertyId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return { success: false, error: "Unauthorized" };
    }

    const ownerId = session.user.id;

    // ดึงเฉพาะของ owner ที่ล็อกอิน
    const submissions = await prisma.meterSubmission.findMany({
      where: {
        status: "PENDING",
        room: {
          property: {
            ownerId,
            ...(propertyId && { id: propertyId })
          }
        }
      },
      include: {
        room: {
          select: {
            number: true,
            waterMeterStart: true,
            electricMeterStart: true,
            property: {
              select: {
                id: true,
                name: true,
                waterRate: true,
                electricRate: true
              }
            }
          }
        },
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // คำนวณครั้งก่อนหน้าและยูนิตที่จะใช้ แบบ Dynamic
    const submissionsWithPrev = await Promise.all(
      submissions.map(async (sub) => {
        const prevPeriod = getPreviousPeriod(sub.month, sub.year);
        const lastMonthBill = await prisma.bill.findFirst({
          where: {
            roomId: sub.roomId,
            month: prevPeriod.month,
            year: prevPeriod.year,
            type: "MONTHLY",
            isDeleted: false
          },
          select: {
            waterReading: true,
            electricReading: true
          }
        });

        let previousReading = 0;
        if (sub.type === "ELECTRIC") {
          previousReading = lastMonthBill?.electricReading ?? sub.room.electricMeterStart ?? 0;
        } else {
          previousReading = lastMonthBill?.waterReading ?? sub.room.waterMeterStart ?? 0;
        }

        return {
          ...sub,
          previousReading,
          unitsUsed: Math.max(0, sub.reading - previousReading)
        };
      })
    );

    return { success: true, submissions: submissionsWithPrev };
  } catch (error: any) {
    console.error("getPendingSubmissions error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล" };
  }
}

/**
 * 👍 อนุมัติการแจ้งมิเตอร์จากผู้เช่า (เรียกใช้บิล upsert เดิมเพื่อความปลอดภัยและลดการสร้างตรรกะซ้ำ)
 */
export async function approveMeterSubmission(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return { success: false, error: "Unauthorized" };
    }

    const secureDb = await getSecurePrisma();

    // 1. ค้นหา submission
    const submission = await prisma.meterSubmission.findUnique({
      where: { id },
      include: {
        room: true,
        tenant: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!submission) {
      return { success: false, error: "ไม่พบข้อมูลรายการส่งมิเตอร์" };
    }

    // 2. ตรวจสอบสิทธิ์เจ้าของห้องพัก (ผ่าน Room RLS ของ secureDb)
    const room = await secureDb.room.findFirst({
      where: { id: submission.roomId }
    });

    if (!room) {
      return { success: false, error: "ไม่มีสิทธิ์เข้าถึงหรืออนุมัติรายการของห้องพักนี้" };
    }

    // กันอนุมัติซ้ำ (idempotency) — อนุมัติได้เฉพาะรายการที่ยัง PENDING
    if (submission.status !== "PENDING") {
      return { success: false, error: "รายการนี้ถูกดำเนินการไปแล้ว ไม่สามารถอนุมัติซ้ำได้" };
    }

    // 3. เรียกบันทึกมิเตอร์แบบ Upsert รวมเข้าไปในระบบบิลด้วย saveBulkMeterReadings ดั้งเดิม
    await saveBulkMeterReadings(
      room.propertyId,
      submission.month,
      submission.year,
      submission.type,
      [{ roomId: submission.roomId, currentReading: submission.reading }]
    );

    // 4. ปรับเปลี่ยนสถานะของ submission
    await prisma.meterSubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date()
      }
    });

    // 5. แจ้งเตือนลูกบ้านเพิ่มเติมในระบบ Notification
    try {
      const typeLabel = submission.type === "WATER" ? "ประปา" : "ไฟฟ้า";
      await createDbNotification(
        submission.tenant.userId,
        `อนุมัติการแจ้งยอดมิเตอร์${typeLabel}`,
        `ตัวเลขมิเตอร์${typeLabel} ห้อง ${room.number} รอบเดือน ${submission.month}/${submission.year} ได้รับการตรวจสอบและอนุมัติแล้วค่ะ`,
        "BILL"
      );
    } catch (err) {
      console.error("Failed to trigger approve notifications:", err);
    }

    revalidatePath("/dashboard/meters");
    return { success: true };
  } catch (error: any) {
    console.error("approveMeterSubmission error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการอนุมัติ" };
  }
}

/**
 * 👎 ปฏิเสธการแจ้งมิเตอร์จากผู้เช่า (แจ้งเตือนเหตุผลพร้อมปลดล็อกให้ส่งใหม่ได้)
 */
export async function rejectMeterSubmission(id: string, note: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return { success: false, error: "Unauthorized" };
    }

    const secureDb = await getSecurePrisma();

    // 1. ค้นหาข้อมูลผู้ส่งและข้อมูล Token LINE OA
    const submission = await prisma.meterSubmission.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: {
              include: {
                owner: {
                  select: {
                    lineChannelAccessToken: true
                  }
                }
              }
            }
          }
        },
        tenant: {
          select: {
            userId: true,
            lineUserId: true
          }
        }
      }
    });

    if (!submission) {
      return { success: false, error: "ไม่พบข้อมูลรายการส่งมิเตอร์" };
    }

    // 2. ตรวจสอบสิทธิ์เจ้าของห้องพัก (ผ่าน Room RLS)
    const room = await secureDb.room.findFirst({
      where: { id: submission.roomId }
    });

    if (!room) {
      return { success: false, error: "ไม่มีสิทธิ์เข้าถึงห้องพักนี้" };
    }

    // 3. ปรับเป็นปฏิเสธและแนบข้อความแจ้งเตือน
    await prisma.meterSubmission.update({
      where: { id },
      data: {
        status: "REJECTED",
        note
      }
    });

    const typeLabel = submission.type === "WATER" ? "ประปา" : "ไฟฟ้า";

    // 4. ส่งระบบ Notification ในระบบ
    try {
      await createDbNotification(
        submission.tenant.userId,
        `ยอดมิเตอร์${typeLabel} ไม่ผ่านการอนุมัติ`,
        `ตัวเลขมิเตอร์ห้อง ${room.number} ประจำเดือน ${submission.month}/${submission.year} ไม่ผ่านการอนุมัติเนื่องจาก: ${note}`,
        "BILL"
      );
    } catch (err) {
      console.error("Failed to send reject notifications:", err);
    }

    // 5. ส่ง LINE OA เตือน (หากผู้เช่าผูกไลน์ไว้และเจ้าของใส่ token)
    const lineToken = submission.room.property.owner?.lineChannelAccessToken;
    const targetLineId = submission.tenant.lineUserId;

    if (lineToken && targetLineId) {
      const lineMsg = `⚠️ แจ้งเตือนห้อง ${room.number}: การส่งยอดมิเตอร์${typeLabel} ประจำเดือน ${submission.month}/${submission.year} ไม่ผ่านการอนุมัติ\n\nเหตุผล: ${note}\n\nกรุณาเข้าสู่ระบบตรวจสอบภาพหลักฐานและกดส่งตัวเลขใหม่อีกครั้งค่ะ`;
      await sendLineOAMessage(targetLineId, lineMsg, lineToken);
    }

    revalidatePath("/dashboard/meters");
    return { success: true };
  } catch (error: any) {
    console.error("rejectMeterSubmission error:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการปฏิเสธ" };
  }
}
