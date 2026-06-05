import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecurePrisma } from "@/lib/prisma-secure";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, address, imageUrl } = await req.json();

    if (!name || !address) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const secureDb = await getSecurePrisma();

    const property = await secureDb.property.create({
      data: {
        name,
        address,
        imageUrl,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const secureDb = await getSecurePrisma();

    const properties = await secureDb.property.findMany({
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    return NextResponse.json(properties);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
