import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const owners = await prisma.user.findMany({
      where: { role: "OWNER" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { properties: true }
        },
        registrationCodes: {
          where: { isUsed: true },
          select: { code: true, months: true, createdAt: true }
        }
      }
    });

    const sanitizedOwners = owners.map(owner => {
      const { password, ...rest } = owner as any;
      return rest;
    });

    return NextResponse.json(sanitizedOwners);
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
