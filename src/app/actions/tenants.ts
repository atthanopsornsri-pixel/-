"use server";

import { getSecurePrisma } from "@/lib/prisma-secure";

export async function getBuildingsWithTenants() {
  const prisma = await getSecurePrisma();

  // 1. Fetch all properties belonging to this owner
  const properties = await prisma.property.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" }
  });

  // 2. Map properties to the structure required by the tenants drill-down page
  const result = await Promise.all(
    properties.map(async (property) => {
      // Fetch all rooms for this property to get total / vacant / occupied counts
      const allRooms = await prisma.room.findMany({
        where: {
          propertyId: property.id,
          isDeleted: false
        },
        include: {
          tenants: {
            where: { isDeleted: false },
            include: { user: true }
          },
          bills: {
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { number: "asc" }
      });

      const totalRooms = allRooms.length;
      const occupiedRooms = allRooms.filter((r) => r.status === "OCCUPIED");
      const activeTenantsCount = occupiedRooms.length;
      const vacantRoomsCount = allRooms.filter((r) => r.status === "AVAILABLE").length;

      const tenantsList = occupiedRooms
        .filter((r) => r.tenants.length > 0)
        .map((r) => {
          const tenant = r.tenants[0];
          return {
            id: tenant.id,
            name: tenant.user.name || "ผู้เช่าไม่มีชื่อ",
            phone: tenant.phoneNumber || "ไม่ระบุเบอร์",
            email: tenant.user.email || "ไม่ระบุอีเมล",
            roomNumber: r.number,
            roomId: r.id,
            username: tenant.user.username || tenant.user.email || "",
            joinDate: tenant.createdAt.toISOString().split("T")[0],
            status: r.bills[0]?.status === "UNPAID" ? "PENDING_LEAVE" : "ACTIVE",
          };
        });

      return {
        id: property.id,
        name: property.name,
        location: property.address || "ไม่ระบุที่อยู่",
        totalRooms,
        activeTenantsCount,
        vacantRoomsCount,
        tenants: tenantsList
      };
    })
  );

  return result;
}
