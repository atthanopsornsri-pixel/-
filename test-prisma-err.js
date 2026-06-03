const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = '';
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'test' } }).catch(console.log);
