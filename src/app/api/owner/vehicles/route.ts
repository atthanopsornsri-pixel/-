import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/owner/vehicles
 * ดึงรายการยานพาหนะทั้งหมดของผู้เช่าในหอพักที่ Owner ดูแล
 * Query: ?propertyId=xxx (optional, ถ้าไม่ส่งจะดึงทุกหอพัก)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");

  // ดึง properties ของ owner นี้
  const propertyFilter = propertyId
    ? { id: propertyId, ownerId: session.user.id }
    : { ownerId: session.user.id };

  const rooms = await prisma.room.findMany({
    where: {
      property: propertyFilter,
      isDeleted: false,
      status: "OCCUPIED",
    },
    include: {
      tenants: {
        where: { isDeleted: false },
        include: {
          vehicles: { orderBy: { createdAt: "desc" } },
          user: { select: { name: true } },
        },
      },
      property: { select: { name: true } },
    },
  });

  // Flatten vehicles กับข้อมูลห้องพัก
  const vehicles = rooms.flatMap((room) =>
    room.tenants.flatMap((tenant) =>
      tenant.vehicles.map((v) => ({
        ...v,
        tenantName: tenant.user?.name ?? tenant.firstName ?? "-",
        roomNumber: room.number,
        propertyName: room.property.name,
      }))
    )
  );

  return NextResponse.json(vehicles);
}
