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

    const tenants = await prisma.tenant.findMany({
      where: {
        room: {
          property: {
            ownerId: session.user.id,
          },
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { number: true, rentPrice: true, property: { select: { name: true, leaseTemplate: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
