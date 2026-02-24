-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearMonth" TEXT NOT NULL,
    "categoryId" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_budgets" ("amount", "categoryId", "createdAt", "id", "updatedAt", "yearMonth") SELECT "amount", "categoryId", "createdAt", "id", "updatedAt", "yearMonth" FROM "budgets";
DROP TABLE "budgets";
ALTER TABLE "new_budgets" RENAME TO "budgets";
CREATE UNIQUE INDEX "budgets_yearMonth_categoryId_key" ON "budgets"("yearMonth", "categoryId");
CREATE TABLE "new_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "actualAmount" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "csvImportId" TEXT,
    "aiCategorized" BOOLEAN NOT NULL DEFAULT false,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_csvImportId_fkey" FOREIGN KEY ("csvImportId") REFERENCES "csv_imports" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_expenses" ("actualAmount", "aiCategorized", "amount", "categoryId", "confirmed", "createdAt", "csvImportId", "date", "description", "id", "isSubstitute", "memo", "source", "updatedAt", "userId", "visibility") SELECT "actualAmount", "aiCategorized", "amount", "categoryId", "confirmed", "createdAt", "csvImportId", "date", "description", "id", "isSubstitute", "memo", "source", "updatedAt", "userId", "visibility" FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");
CREATE INDEX "expenses_userId_date_idx" ON "expenses"("userId", "date");
CREATE INDEX "expenses_date_idx" ON "expenses"("date");
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");
CREATE INDEX "expenses_csvImportId_idx" ON "expenses"("csvImportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
