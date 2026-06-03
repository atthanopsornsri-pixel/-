const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log("Connecting to database...");
  const users = await prisma.user.findMany();
  console.log("Users found:", users.map(u => ({ id: u.id, email: u.email, role: u.role })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
