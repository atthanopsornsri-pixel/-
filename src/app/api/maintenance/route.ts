import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { sendSmsWithAddon } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TENANT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // รองรับทั้ง FormData (รูปรวมมาด้วย 1 call) และ JSON (backwards compat)
    const contentType = req.headers.get("content-type") || "";
    let title: string = "";
    let description: string = "";
    let imageUrl: string = "";

    let preferredAt: Date | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      const preferredAtStr = formData.get("preferredAt") as string | null;
      if (preferredAtStr) {
        const d = new Date(preferredAtStr);
        if (!isNaN(d.getTime())) preferredAt = d;
      }
      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json({ message: "ไฟล์ใหญ่เกิน 5 MB" }, { status: 413 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        imageUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
      }
    } else {
      const body = await req.json();
      title = body.title || "";
      description = body.description || "";
      imageUrl = body.imageUrl || "";
      if (body.preferredAt) {
        const d = new Date(body.preferredAt);
        if (!isNaN(d.getTime())) preferredAt = d;
      }
    }

    if (!title || !description) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // ดึงข้อมูลผู้เช่าพร้อม room/property/owner สำหรับ LINE notification
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
      include: {
        room: {
          include: {
            property: {
              include: { owner: true }
            }
          }
        }
      }
    });

    if (!tenant || !tenant.roomId) {
      return NextResponse.json({ message: "You don't have an assigned room" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        roomId: tenant.roomId,
        title,
        description,
        imageUrl,
        ...(preferredAt && { preferredAt }),
      },
    });

    // ส่ง LINE แจ้งเจ้าของ (fire-and-forget — ไม่ await เพื่อ response เร็ว)
    const owner = tenant.room?.property?.owner;
    if (owner?.lineChannelAccessToken && owner?.lineUserId) {
      const propertyName = tenant.room?.property?.name || "หอพัก";
      const roomNumber = tenant.room?.number || "-";
      const tenantName =
        [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") ||
        tenant.phoneNumber ||
        "ผู้เช่า";
      const now = new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

      const preferredStr = preferredAt
        ? preferredAt.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
        : null;

      const lineMsg = [
        `🔧 แจ้งซ่อมใหม่ — ต้องการความช่วยเหลือ!`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🏠 ${propertyName}  ห้อง ${roomNumber}`,
        `👤 ผู้เช่า: ${tenantName}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🔴 เรื่อง: ${title}`,
        `📝 รายละเอียด:`,
        description,
        preferredStr ? `━━━━━━━━━━━━━━━━━━━━` : "",
        preferredStr ? `🗓 ผู้เช่าสะดวกรับช่าง: ${preferredStr}` : "",
        `━━━━━━━━━━━━━━━━━━━━`,
        `⏰ แจ้งเมื่อ: ${now}`,
        `👉 เข้าระบบเพื่อรับเรื่องและนัดหมาย`,
      ].filter(Boolean).join("\n");

      sendLineOAMessage(owner.lineUserId, lineMsg, owner.lineChannelAccessToken)
        .catch((err) => console.error("[LINE] maintenance notify error:", err));
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let requests;

    if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (!tenant?.roomId) return NextResponse.json([]);

      requests = await prisma.maintenanceRequest.findMany({
        where: { roomId: tenant.roomId, isDeleted: false },
        orderBy: { createdAt: "desc" },
      });
    } else if (session.user.role === "OWNER") {
      const { searchParams } = new URL(req.url);
      const propertyId = searchParams.get("propertyId");

      const whereClause: any = {
        isDeleted: false,
        room: { property: { ownerId: session.user.id } },
      };
      if (propertyId) {
        whereClause.room.propertyId = propertyId;
      }

      requests = await prisma.maintenanceRequest.findMany({
        where: whereClause,
        include: {
          room: { select: { number: true, property: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, status, scheduledAt, scheduledNote } = await req.json();

    // ยืนยันความเป็นเจ้าของก่อนอัปเดต
    const maintReq = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: {
              include: { owner: true }
            }
          }
        }
      }
    });

    if (!maintReq) {
      return NextResponse.json({ message: "Maintenance request not found" }, { status: 404 });
    }
    if (maintReq.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status,
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(scheduledNote !== undefined && { scheduledNote: scheduledNote || null }),
      },
      include: {
        room: { select: { number: true } }
      }
    });

    // แจ้ง LINE + SMS ผู้เช่า (fire-and-forget)
    const owner = maintReq.room.property.owner;
    const tenant = await prisma.tenant.findFirst({
      where: { roomId: request.roomId },
      select: { lineUserId: true, phoneNumber: true }
    });

    const roomNumber = request.room.number;
    const reqTitle = maintReq.title;
    let lineMsg: string | null = null;
    let smsMsg: string | null = null;

    if (status === "IN_PROGRESS" && scheduledAt) {
      const apptDate = new Date(scheduledAt);
      const dateStr = apptDate.toLocaleDateString("th-TH", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      const timeStr = apptDate.toLocaleTimeString("th-TH", {
        hour: "2-digit", minute: "2-digit",
      });
      const noteLines = scheduledNote ? [`📝 หมายเหตุ: ${scheduledNote}`] : [];
      lineMsg = [
        `📅 นัดหมายเข้าซ่อมแล้วค่ะ!`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🏠 ห้อง ${roomNumber}`,
        `📌 เรื่อง: ${reqTitle}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📅 วันที่: ${dateStr}`,
        `⏰ เวลา: ${timeStr} น.`,
        ...noteLines,
        `━━━━━━━━━━━━━━━━━━━━`,
        `⚠️ กรุณาเตรียมพร้อมและเปิดห้องรับช่างด้วยนะคะ 🙏`,
      ].join("\n");
      smsMsg = `[JadHor] นัดซ่อมห้อง ${roomNumber} เรื่อง "${reqTitle}" วันที่ ${dateStr} เวลา ${timeStr} น.${scheduledNote ? ` (${scheduledNote})` : ""}`;
    } else if (status === "IN_PROGRESS") {
      lineMsg = [
        `🔧 อัปเดตเรื่องแจ้งซ่อมของคุณ`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🏠 ห้อง ${roomNumber}`,
        `📌 เรื่อง: ${reqTitle}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🔄 สถานะ: รับเรื่องแล้ว กำลังประสานงาน`,
        `จะแจ้งวันนัดหมายให้ทราบอีกครั้งนะคะ 🙏`,
      ].join("\n");
      smsMsg = `[JadHor] รับเรื่องแจ้งซ่อมห้อง ${roomNumber} แล้ว (${reqTitle}) กำลังประสานงาน จะแจ้งนัดหมายเพิ่มเติม`;
    } else if (status === "COMPLETED") {
      lineMsg = [
        `✅ งานซ่อมเสร็จสิ้นแล้ว!`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🏠 ห้อง ${roomNumber}`,
        `📌 เรื่อง: ${reqTitle}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `✨ ช่างซ่อมเรียบร้อยแล้วค่ะ`,
        `หากมีปัญหาเพิ่มเติมหรืออยากแจ้งซ่อมอีกครั้ง`,
        `สามารถแจ้งผ่านแอปได้เลยนะคะ 😊`,
      ].join("\n");
      smsMsg = `[JadHor] งานซ่อมห้อง ${roomNumber} (${reqTitle}) เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ`;
    }

    if (lineMsg && owner.lineChannelAccessToken && tenant?.lineUserId) {
      sendLineOAMessage(tenant.lineUserId, lineMsg, owner.lineChannelAccessToken)
        .catch((err) => console.error("[LINE] maintenance status notify error:", err));
    }

    if (smsMsg && tenant?.phoneNumber && maintReq.room.property.ownerId) {
      sendSmsWithAddon(maintReq.room.property.ownerId, tenant.phoneNumber, smsMsg)
        .catch((err) => console.error("[SMS] maintenance status notify error:", err));
    }

    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
