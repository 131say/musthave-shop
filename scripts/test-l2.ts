import { prisma } from "@/lib/prisma";

async function main() {
  // Проверяем, есть ли админ
  let admin = await prisma.user.findUnique({ where: { login: "admin" } });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        login: "admin",
        phone: "77777777777",
        email: "admin@test.com",
        passwordHash: "admin123",
        role: "ADMIN",
        referralCode: "ADMIN_001",
      },
    });
    console.log("✓ Admin created");
  } else {
    console.log("✓ Admin already exists");
  }

  // Проверяем AppSettings
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  console.log("✓ AppSettings:");
  console.log("  - customerPercent:", settings?.customerPercent);
  console.log("  - inviterPercent:", settings?.inviterPercent);
  console.log("  - inviterBonusLevel2Percent:", settings?.inviterBonusLevel2Percent);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
