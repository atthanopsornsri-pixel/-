import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoomLimit } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, number, floor, rentPrice } = await req.json();

    if (!propertyId || !number || rentPrice === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership of the property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized property access" }, { status: 403 });
    }

    // Check Plan Limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        properties: {
          include: {
            _count: {
              select: { rooms: { where: { isDeleted: false } } }
            }
          }
        }
      }
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const totalRooms = user.properties.reduce((acc: number, p: any) => acc + p._count.rooms, 0);

    const roomLimit = getRoomLimit(user.planTier);

    if (totalRooms >= roomLimit) {
      return NextResponse.json({ 
        message: `ถึงขีดจำกัดจำนวนห้องของแพ็กเกจแล้ว (${totalRooms}/${roomLimit} ห้อง) กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มห้องได้มากขึ้น`,
        code: "LIMIT_REACHED",
        currentTotal: totalRooms,
        limit: roomLimit,
        plan: user.planTier
      }, { status: 403 });
    }

    // Generate a unique 6-character invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room = await prisma.room.create({
      data: {
        number,
        floor,
        rentPrice: parseFloat(rentPrice),
        propertyId,
        inviteCode,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    let whereClause: any = {
      isDeleted: false,
      property: { ownerId: session.user.id },
    };

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      select: {
        id: true,
        number: true,
        floor: true,
        rentPrice: true,
        status: true,
        inviteCode: true,
        imageMain: true,
        hasAircon: true,
        hasFan: true,
        hasFurniture: true,
        waterMeterStart: true,
        electricMeterStart: true,
        // Omit imageBathroom, imageBalcony, imageFacility to save bandwidth
        propertyId: true,
        property: { select: { name: true } },
        tenants: true,
      },
      orderBy: [
        { floor: "asc" },
        { number: "asc" },
      ],
    });

    // Backfill: ห้องที่สร้างก่อนมีระบบรหัสเชิญจะไม่มี inviteCode — สร้างเติมให้อัตโนมัติ
    for (const room of rooms) {
      if (!room.inviteCode) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, "X");
          try {
            await prisma.room.update({ where: { id: room.id }, data: { inviteCode: code } });
            room.inviteCode = code;
            break;
          } catch {
            // ชนกับรหัสที่มีอยู่แล้ว (@unique) — สุ่มใหม่
          }
        }
      }
    }

    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
