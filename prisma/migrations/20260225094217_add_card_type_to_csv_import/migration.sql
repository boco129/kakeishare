/*
  Warnings:

  - Added the required column `cardType` to the `csv_imports` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_csv_imports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "unconfirmedCount" INTEGER NOT NULL DEFAULT 0,
    "fileHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "csv_imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "csv_imports_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_csv_imports" ("cardName", "createdAt", "fileHash", "id", "importedAt", "importedById", "recordCount", "unconfirmedCount", "updatedAt", "userId", "yearMonth") SELECT "cardName", "createdAt", "fileHash", "id", "importedAt", "importedById", "recordCount", "unconfirmedCount", "updatedAt", "userId", "yearMonth" FROM "csv_imports";
DROP TABLE "csv_imports";
ALTER TABLE "new_csv_imports" RENAME TO "csv_imports";
CREATE INDEX "csv_imports_userId_idx" ON "csv_imports"("userId");
CREATE INDEX "csv_imports_importedById_idx" ON "csv_imports"("importedById");
CREATE INDEX "csv_imports_userId_cardType_yearMonth_idx" ON "csv_imports"("userId", "cardType", "yearMonth");
CREATE UNIQUE INDEX "csv_imports_userId_fileHash_key" ON "csv_imports"("userId", "fileHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
