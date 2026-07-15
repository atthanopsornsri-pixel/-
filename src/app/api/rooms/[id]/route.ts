import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canAccessProperty } from "@/lib/staff-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { property: true, tenants: true },
    });

    if (!room || room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "ไม่พบห้องหรือไม่มีสิทธิ์" }, { status: 403 });
    }
    if (room.tenants.length > 0) {
      return NextResponse.json({ message: "ไม่สามารถลบห้องที่มีผู้เช่าอยู่" }, { status: 400 });
    }

    await prisma.bill.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });

    revalidatePath("/dashboard/rooms");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const {
      number, floor, rentPrice,
      status, waterMeterStart, electricMeterStart,
      hasAircon, hasFan, hasFurniture,
      imageMain, imageBathroom, imageBalcony, imageFacility
    } = await req.json();

    const room = await prisma.room.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!room || !(await canAccessProperty(session.user.role, session.user.id, room.property.ownerId, room.propertyId))) {
      return NextResponse.json({ message: "Not found or forbidden" }, { status: 403 });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        number,
        floor,
        rentPrice: parseFloat(rentPrice),
        status,
        waterMeterStart,
        electricMeterStart,
        hasAircon,
        hasFan,
        hasFurniture,
        imageMain,
        imageBathroom,
        imageBalcony,
        imageFacility
      },
    });

    revalidatePath("/dashboard/rooms");

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
