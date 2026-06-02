const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@apartment.com' },
    update: { password },
    create: {
      email: 'admin@apartment.com',
      name: 'Platform Admin',
      password,
      role: 'ADMIN',
    },
  });

  // Owner
  const owner = await prisma.user.upsert({
    where: { email: 'owner@apartment.com' },
    update: { password },
    create: {
      email: 'owner@apartment.com',
      name: 'Property Owner',
      password,
      role: 'OWNER',
    },
  });

  // Tenant
  const tenantUser = await prisma.user.upsert({
    where: { email: 'tenant@apartment.com' },
    update: { password },
    create: {
      email: 'tenant@apartment.com',
      name: 'สมชาย ใจดี',
      password,
      role: 'TENANT',
    },
  });

  // Create mock property and room if not exists
  let property = await prisma.property.findFirst({ where: { ownerId: owner.id } });
  if (!property) {
    property = await prisma.property.create({
      data: {
        name: 'สบายดี อพาร์ตเม้นท์',
        address: '123 ถ.สุขุมวิท กรุงเทพ',
        ownerId: owner.id,
      }
    });
  }

  let room = await prisma.room.findFirst({ where: { propertyId: property.id } });
  if (!room) {
    room = await prisma.room.create({
      data: {
        number: '101',
        floor: '1',
        propertyId: property.id,
        status: 'OCCUPIED',
        rentPrice: 4500
      }
    });
  }

  // Create tenant profile
  let tenantProfile = await prisma.tenant.findUnique({ where: { userId: tenantUser.id } });
  if (!tenantProfile) {
    await prisma.tenant.create({
      data: {
        userId: tenantUser.id,
        roomId: room.id,
        phone: '0812345678',
        idCardNumber: '1103456789123',
        leaseStart: new Date(),
      }
    });
  }

  console.log('Accounts created successfully. Tenant account added.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
