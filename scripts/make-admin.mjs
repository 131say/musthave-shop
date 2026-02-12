import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const updated = await prisma.user.update({
    where: { login: "admin" },
    data: { role: "ADMIN" },
  });
  console.log("✓ User admin set as ADMIN");
  console.log("  ID:", updated.id);
  console.log("  Role:", updated.role);
} catch (e) {
  console.error("❌ Error:", e.message);
} finally {
  await prisma.$disconnect();
}
