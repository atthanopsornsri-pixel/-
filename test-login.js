const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'owner@apartment.com' } });
  if (!user) return console.log('User not found');
  const valid = await bcrypt.compare('password123', user.password);
  console.log('Password valid:', valid);
}
main().finally(() => prisma.$disconnect());
