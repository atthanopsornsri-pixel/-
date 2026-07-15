import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLineOAMessage } from "@/lib/line";
import { sendSmsWithAddon } from "@/lib/sms";
import { createDbNotification } from "@/app/actions/notifications";
import { canAccessProperty } from "@/lib/staff-auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { trackingNumber, recipientName, roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 });
    }

    // Verify room belongs to owner and fetch owner's LINE token
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        property: {
          include: {
            owner: true
          }
        }
      },
    });

    if (!room || !(await canAccessProperty(session.user.role, session.user.id, room.property.ownerId, room.propertyId))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const parcel = await prisma.parcel.create({
      data: {
        trackingNumber,
        recipientName,
        roomId,
      },
      include: {
        room: { select: { number: true, property: { select: { name: true } } } }
      }
    });

    // Notify Tenant via LINE + SMS (fire-and-forget)
    const tenant = await prisma.tenant.findFirst({
      where: { roomId },
      select: { lineUserId: true, phoneNumber: true, userId: true }
    });

    if (tenant?.userId) {
      after(() =>
        createDbNotification(
          tenant.userId,
          `พัสดุเข้าใหม่ 📦`,
          `ห้อง ${parcel.room.number} มีพัสดุจัดส่งถึงคุณ ผู้รับ: ${recipientName || "-"} (เลขติดตามพัสดุ: ${trackingNumber || "-"})`,
          "PARCEL"
        )
      );
    }

    const parcelMsg = `มีพัสดุมาส่ง! ห้อง ${parcel.room.number} | ผู้รับ: ${recipientName || "-"} | เลขพัสดุ: ${trackingNumber || "-"}`;

    if (room?.property?.owner?.lineChannelAccessToken && tenant?.lineUserId) {
      const tenantLineId = tenant.lineUserId;
      const lineToken = room.property.owner.lineChannelAccessToken;
      after(() =>
        sendLineOAMessage(tenantLineId, `📦 ${parcelMsg}`, lineToken)
          .catch((err) => console.error("[LINE] parcel notify error:", err))
      );
    }

    if (tenant?.phoneNumber && room?.property?.ownerId) {
      const tenantPhone = tenant.phoneNumber;
      const ownerId = room.property.ownerId;
      after(() =>
        sendSmsWithAddon(ownerId, tenantPhone, `[JadHor] ${parcelMsg}`)
          .catch((err) => console.error("[SMS] parcel notify error:", err))
      );
    }

    return NextResponse.json(parcel, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let parcels;

    if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      
      if (!tenant?.roomId) return NextResponse.json([]);

      parcels = await prisma.parcel.findMany({
        where: { roomId: tenant.roomId, isDeleted: false },
        orderBy: { receivedAt: "desc" },
      });
    } else if (session.user.role === "OWNER" || session.user.role === "STAFF") {
      const propertyScope =
        session.user.role === "OWNER"
          ? { ownerId: session.user.id }
          : { id: { in: session.user.assignedPropertyIds ?? [] } };
      parcels = await prisma.parcel.findMany({
        where: {
          isDeleted: false,
          room: { property: propertyScope }
        },
        include: {
          room: { select: { number: true, property: { select: { name: true } } } }
        },
        orderBy: { receivedAt: "desc" },
      });
    }

    return NextResponse.json(parcels || []);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await req.json();

    // Verify ownership of the parcel room's property
    const existingParcel = await prisma.parcel.findUnique({
      where: { id },
      include: {
        room: {
          include: { property: true }
        }
      }
    });

    if (!existingParcel) {
      return NextResponse.json({ message: "Parcel not found" }, { status: 404 });
    }

    if (!(await canAccessProperty(session.user.role, session.user.id, existingParcel.room.property.ownerId, existingParcel.room.propertyId))) {
      return NextResponse.json({ message: "Unauthorized: You do not own this property" }, { status: 403 });
    }

    const parcel = await prisma.parcel.update({
      where: { id },
      data: {
        status,
        pickedUpAt: status === "PICKED_UP" ? new Date() : null,
      },
    });

    return NextResponse.json(parcel);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
