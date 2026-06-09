const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== PROPERTIES ===");
  const properties = await prisma.property.findMany();
  console.log(properties.map(p => ({ id: p.id, name: p.name, ownerId: p.ownerId })));

  console.log("=== ROOMS ===");
  const rooms = await prisma.room.findMany({
    include: {
      property: true
    }
  });
  console.log(rooms.map(r => ({ id: r.id, number: r.number, propertyId: r.propertyId, propertyOwnerId: r.property?.ownerId, status: r.status })));

  console.log("=== TENANTS ===");
  const tenants = await prisma.tenant.findMany({
    include: {
      room: {
        include: {
          property: true
        }
      }
    }
  });
  console.log(tenants.map(t => ({ 
    id: t.id, 
    userId: t.userId, 
    roomId: t.roomId, 
    roomNumber: t.room?.number, 
    propertyId: t.room?.propertyId,
    ownerId: t.room?.property?.ownerId
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
