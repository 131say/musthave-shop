-- AlterTable
ALTER TABLE "User" ADD COLUMN "login" TEXT;
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- Make phone nullable (it's now a contact, not login)
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;


