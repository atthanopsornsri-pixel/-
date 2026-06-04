import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, number, floor, rentPrice, imageMain, imageBathroom, imageBalcony, imageFacility } = await req.json();

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

    // Generate a unique 6-character invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room = await prisma.room.create({
      data: {
        number,
        floor,
        rentPrice: parseFloat(rentPrice),
        imageMain,
        imageBathroom,
        imageBalcony,
        imageFacility,
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
      include: {
        property: { select: { name: true } },
        tenants: true,
      },
      orderBy: [
        { floor: "asc" },
        { number: "asc" },
      ],
    });

    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
