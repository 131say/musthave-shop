// scripts/checkUsers.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      referralCode: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`\n📊 Всего пользователей: ${users.length}\n`);
  users.forEach((u) => {
    console.log(`  ID: ${u.id} | Login: ${u.login} | Role: ${u.role} | Code: ${u.referralCode}`);
  });
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

