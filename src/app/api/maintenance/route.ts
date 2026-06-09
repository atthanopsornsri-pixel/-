import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TENANT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title, description, imageUrl } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Get tenant's room and owner info for LINE notification
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
      include: {
        room: {
          include: {
            property: {
              include: {
                owner: true
              }
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
      },
    });

    // ส่ง LINE แบบ fire-and-forget (ไม่ await เพื่อ response เร็ว)
    if (tenant.room?.property?.owner?.lineChannelAccessToken && tenant.room?.property?.owner?.lineUserId) {
      const propertyName = tenant.room.property.name || "หอพัก";
      const roomNumber = tenant.room.number;
      const tenantName = tenant.room.property.owner.name || "ผู้เช่า";
      const lineMsg = [
        `📋 แจ้งซ่อมใหม่`,
        `━━━━━━━━━━━━━━`,
        `🏠 ${propertyName} ห้อง ${roomNumber}`,
        `📌 เรื่อง: ${title}`,
        `📝 รายละเอียด: ${description}`,
        `━━━━━━━━━━━━━━`,
        `กรุณาเข้าระบบเพื่อตรวจสอบและอัปเดตสถานะ`,
      ].join("\n");

      sendLineOAMessage(
        tenant.room.property.owner.lineUserId,
        lineMsg,
        tenant.room.property.owner.lineChannelAccessToken
      ).catch((err) => console.error("[LINE] maintenance notify error:", err));
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

      let whereClause: any = {
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

    const { id, status } = await req.json();

    // Verify ownership of the maintenance request room's property
    const maintReq = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: {
              include: {
                owner: true
              }
            }
          }
        }
      }
    });

    if (!maintReq) {
      return NextResponse.json({ message: "Maintenance request not found" }, { status: 404 });
    }

    if (maintReq.room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized: You do not own this property" }, { status: 403 });
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status },
      include: {
        room: { select: { number: true } }
      }
    });

    // Notify Tenant if they have lineUserId setup
    const tenant = await prisma.tenant.findFirst({
      where: { roomId: request.roomId },
      select: { lineUserId: true }
    });

    if (maintReq.room.property.owner.lineChannelAccessToken && tenant?.lineUserId) {
      const statusEmoji = status === "IN_PROGRESS" ? "🔧" : "✅";
      const statusText = status === "IN_PROGRESS" ? "กำลังดำเนินการแก้ไข" : "ดำเนินการแก้ไขเสร็จสิ้นแล้ว";
      const lineMsg = [
        `${statusEmoji} อัปเดตสถานะแจ้งซ่อม`,
        `━━━━━━━━━━━━━━`,
        `🏠 ห้อง ${request.room.number}`,
        `📌 เรื่อง: ${request.title}`,
        `📊 สถานะ: ${statusText}`,
        status === "DONE" ? `━━━━━━━━━━━━━━\nขอบคุณที่ใช้บริการ 🙏` : "",
      ].filter(Boolean).join("\n");

      sendLineOAMessage(
        tenant.lineUserId,
        lineMsg,
        maintReq.room.property.owner.lineChannelAccessToken
      ).catch((err) => console.error("[LINE] maintenance status notify error:", err));
    }

    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
