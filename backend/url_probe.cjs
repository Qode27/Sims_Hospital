const { PrismaClient } = require('@prisma/client');

const urls = [
  'file:./data/sims.db',
  'file:data/sims.db',
  'file:/D:/Hospital management/backend/data/sims.db',
  'file:D:/Hospital management/backend/data/sims.db',
  'file:/D:/Hospital%20management/backend/data/sims.db',
  'file:D:/Hospital%20management/backend/data/sims.db',
  'file:./prisma/sims.db'
];

(async () => {
  for (const url of urls) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT 1 as ok');
      console.log('OK', url, rows);
    } catch (e) {
      console.log('FAIL', url, e?.message || e);
    } finally {
      await prisma.$disconnect();
    }
  }
})();
