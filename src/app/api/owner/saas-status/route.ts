import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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

    const totalRooms = user.properties.reduce((acc, p) => acc + p._count.rooms, 0);

    let roomLimit = 0;
    if (user.planTier === "FREE_TRIAL" || user.planTier === "STARTER") {
      roomLimit = 30;
    } else if (user.planTier === "GROWTH") {
      roomLimit = 100;
    } else if (user.planTier === "ENTERPRISE") {
      roomLimit = 999999;
    }

    return NextResponse.json({
      planTier: user.planTier,
      planExpiresAt: user.planExpiresAt,
      totalRooms,
      roomLimit
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
