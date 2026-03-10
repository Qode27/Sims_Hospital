require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT 1 as ok');
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
