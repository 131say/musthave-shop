-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "customerPercent" INTEGER NOT NULL DEFAULT 3,
    "inviterPercent" INTEGER NOT NULL DEFAULT 5,
    "allowFullBonusPay" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Insert initial row
INSERT INTO "AppSettings" ("id", "customerPercent", "inviterPercent", "allowFullBonusPay", "createdAt", "updatedAt")
VALUES (1, 3, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
