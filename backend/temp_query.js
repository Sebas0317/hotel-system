const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.room.findMany().then(r => {
  console.log('Rooms:', r.length);
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
});
