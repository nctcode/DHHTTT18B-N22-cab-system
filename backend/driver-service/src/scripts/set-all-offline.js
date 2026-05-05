const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAllOffline() {
  const result = await prisma.driver.updateMany({
    where: {},
    data: { is_available: false }
  });
  console.log('✅ Updated:', result.count, 'drivers set OFFLINE');
  await prisma.$disconnect();
}

setAllOffline().catch((e) => { console.error(e); process.exit(1); });
