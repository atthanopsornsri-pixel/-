import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { number, floor, rentPrice } = await req.json();

    const room = await prisma.room.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!room || room.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Not found or forbidden" }, { status: 403 });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        number,
        floor,
        rentPrice: parseFloat(rentPrice),
      },
    });

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
