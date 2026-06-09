import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/maintenance/counts
 * Lightweight endpoint for sidebar badge — returns pending/inProgress counts only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ pending: 0, inProgress: 0 });
    }

    const ownerId = session.user.id;

    const [pending, inProgress] = await Promise.all([
      prisma.maintenanceRequest.count({
        where: {
          isDeleted: false,
          status: "PENDING",
          room: { property: { ownerId } },
        },
      }),
      prisma.maintenanceRequest.count({
        where: {
          isDeleted: false,
          status: "IN_PROGRESS",
          room: { property: { ownerId } },
        },
      }),
    ]);

    return NextResponse.json({ pending, inProgress });
  } catch {
    return NextResponse.json({ pending: 0, inProgress: 0 });
  }
}
