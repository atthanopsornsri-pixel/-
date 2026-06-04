import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    
    // There should be only one settings record. Find the first one.
    const existing = await prisma.systemSettings.findFirst();

    let settings;
    if (existing) {
      settings = await prisma.systemSettings.update({
        where: { id: existing.id },
        data
      });
    } else {
      settings = await prisma.systemSettings.create({
        data
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
