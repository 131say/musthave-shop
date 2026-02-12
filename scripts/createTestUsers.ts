// scripts/createTestUsers.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

function refCode(prefix: string) {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

async function upsertUser(login: string, pass: string, role: 'ADMIN' | 'CUSTOMER' | 'CASHIER') {
  const passwordHash = await bcrypt.hash(pass, 10);

  const existing = await prisma.user.findUnique({ where: { login } });

  if (existing) {
    await prisma.user.update({
      where: { login },
      data: { 
        passwordHash, 
        role,
        phone: existing.phone || login, // убеждаемся, что phone установлен
      },
    });
    console.log(`✅ updated: ${login} (${role})`);
    return;
  }

  await prisma.user.create({
    data: {
      login: login, // login = идентификатор аккаунта
      phone: login, // phone = контакт (для тестовых пользователей совпадает)
      name: login,
      email: null,
      referralCode: refCode(login === 'admin' ? 'ADM' : 'CLT'),
      passwordHash,
      role,
      bonusBalance: 0,
      slotsTotal: 1,
    },
  });
  console.log(`✅ created: ${login} (${role})`);
}

async function main() {
  await upsertUser('admin', 'admin', 'ADMIN');
  await upsertUser('user', 'user', 'CUSTOMER');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

