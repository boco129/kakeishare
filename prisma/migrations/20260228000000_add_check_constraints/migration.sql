-- AddCheckConstraints: データ不変条件の制約強化
-- expenses.amount != 0, budgets.amount >= 0, budgets.yearMonth YYYY-MM形式,
-- installments totalMonths > 0, remainingMonths >= 0 かつ <= totalMonths,
-- csv_imports recordCount >= 0, unconfirmedCount >= 0 かつ <= recordCount,
-- csv_imports.yearMonth YYYY-MM形式
--
-- ⚠️ Preflight: 本番適用前に以下のSQLで違反データがないことを確認してください。
--    違反行がある場合、INSERT INTO ... SELECT が CHECK制約で失敗します。
--
-- SELECT 'expenses.amount=0' AS check_name, COUNT(*) AS cnt FROM expenses WHERE "amount" = 0
-- UNION ALL
-- SELECT 'budgets.amount<0', COUNT(*) FROM budgets WHERE "amount" < 0
-- UNION ALL
-- SELECT 'budgets.yearMonth invalid', COUNT(*) FROM budgets
--   WHERE NOT ("yearMonth" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
--     AND CAST(substr("yearMonth", 6, 2) AS INTEGER) BETWEEN 1 AND 12)
-- UNION ALL
-- SELECT 'installments months invalid', COUNT(*) FROM installments
--   WHERE "totalMonths" <= 0 OR "remainingMonths" < 0 OR "remainingMonths" > "totalMonths"
-- UNION ALL
-- SELECT 'installments amounts invalid', COUNT(*) FROM installments
--   WHERE "totalAmount" < 0 OR "monthlyAmount" < 0 OR "fee" < 0
-- UNION ALL
-- SELECT 'csv_imports counters invalid', COUNT(*) FROM csv_imports
--   WHERE "recordCount" < 0 OR "unconfirmedCount" < 0 OR "unconfirmedCount" > "recordCount"
-- UNION ALL
-- SELECT 'csv_imports.yearMonth invalid', COUNT(*) FROM csv_imports
--   WHERE NOT ("yearMonth" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
--     AND CAST(substr("yearMonth", 6, 2) AS INTEGER) BETWEEN 1 AND 12);

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ============================================================
-- expenses: amount != 0 制約
-- ============================================================
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
    "dedupeHash" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_csvImportId_fkey" FOREIGN KEY ("csvImportId") REFERENCES "csv_imports" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_amount_nonzero_ck" CHECK ("amount" <> 0)
);
INSERT INTO "new_expenses" ("id", "userId", "date", "amount", "description", "categoryId", "visibility", "isSubstitute", "actualAmount", "source", "csvImportId", "aiCategorized", "confirmed", "dedupeHash", "memo", "createdAt", "updatedAt")
  SELECT "id", "userId", "date", "amount", "description", "categoryId", "visibility", "isSubstitute", "actualAmount", "source", "csvImportId", "aiCategorized", "confirmed", "dedupeHash", "memo", "createdAt", "updatedAt" FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");
CREATE INDEX "expenses_userId_date_idx" ON "expenses"("userId", "date");
CREATE INDEX "expenses_date_idx" ON "expenses"("date");
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");
CREATE INDEX "expenses_csvImportId_idx" ON "expenses"("csvImportId");
CREATE INDEX "expenses_userId_dedupeHash_idx" ON "expenses"("userId", "dedupeHash");

-- ============================================================
-- budgets: amount >= 0, yearMonth YYYY-MM形式 制約
-- ============================================================
CREATE TABLE "new_budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearMonth" TEXT NOT NULL,
    "categoryId" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "budgets_amount_nonneg_ck" CHECK ("amount" >= 0),
    CONSTRAINT "budgets_year_month_format_ck" CHECK (
        "yearMonth" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
        AND CAST(substr("yearMonth", 6, 2) AS INTEGER) BETWEEN 1 AND 12
    )
);
INSERT INTO "new_budgets" ("id", "yearMonth", "categoryId", "amount", "createdAt", "updatedAt")
  SELECT "id", "yearMonth", "categoryId", "amount", "createdAt", "updatedAt" FROM "budgets";
DROP TABLE "budgets";
ALTER TABLE "new_budgets" RENAME TO "budgets";
CREATE UNIQUE INDEX "budgets_yearMonth_categoryId_key" ON "budgets"("yearMonth", "categoryId");

-- ============================================================
-- installments: totalMonths > 0, remainingMonths >= 0 かつ <= totalMonths,
--               totalAmount >= 0, monthlyAmount >= 0, fee >= 0
-- ============================================================
CREATE TABLE "new_installments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "monthlyAmount" INTEGER NOT NULL,
    "totalMonths" INTEGER NOT NULL,
    "remainingMonths" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "fee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "installments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "installments_total_months_ck" CHECK ("totalMonths" > 0),
    CONSTRAINT "installments_remaining_months_ck" CHECK ("remainingMonths" >= 0),
    CONSTRAINT "installments_remaining_lte_total_ck" CHECK ("remainingMonths" <= "totalMonths"),
    CONSTRAINT "installments_total_amount_nonneg_ck" CHECK ("totalAmount" >= 0),
    CONSTRAINT "installments_monthly_amount_nonneg_ck" CHECK ("monthlyAmount" >= 0),
    CONSTRAINT "installments_fee_nonneg_ck" CHECK ("fee" >= 0)
);
INSERT INTO "new_installments" ("id", "userId", "description", "totalAmount", "monthlyAmount", "totalMonths", "remainingMonths", "startDate", "visibility", "fee", "createdAt", "updatedAt")
  SELECT "id", "userId", "description", "totalAmount", "monthlyAmount", "totalMonths", "remainingMonths", "startDate", "visibility", "fee", "createdAt", "updatedAt" FROM "installments";
DROP TABLE "installments";
ALTER TABLE "new_installments" RENAME TO "installments";
CREATE INDEX "installments_userId_idx" ON "installments"("userId");

-- ============================================================
-- csv_imports: recordCount >= 0, unconfirmedCount >= 0 かつ <= recordCount,
--              yearMonth YYYY-MM形式
-- ============================================================
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
    CONSTRAINT "csv_imports_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "csv_imports_record_count_nonneg_ck" CHECK ("recordCount" >= 0),
    CONSTRAINT "csv_imports_unconfirmed_count_nonneg_ck" CHECK ("unconfirmedCount" >= 0),
    CONSTRAINT "csv_imports_unconfirmed_lte_record_ck" CHECK ("unconfirmedCount" <= "recordCount"),
    CONSTRAINT "csv_imports_year_month_format_ck" CHECK (
        "yearMonth" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
        AND CAST(substr("yearMonth", 6, 2) AS INTEGER) BETWEEN 1 AND 12
    )
);
INSERT INTO "new_csv_imports" ("id", "userId", "importedById", "cardType", "cardName", "yearMonth", "importedAt", "recordCount", "unconfirmedCount", "fileHash", "createdAt", "updatedAt")
  SELECT "id", "userId", "importedById", "cardType", "cardName", "yearMonth", "importedAt", "recordCount", "unconfirmedCount", "fileHash", "createdAt", "updatedAt" FROM "csv_imports";
DROP TABLE "csv_imports";
ALTER TABLE "new_csv_imports" RENAME TO "csv_imports";
CREATE INDEX "csv_imports_userId_idx" ON "csv_imports"("userId");
CREATE INDEX "csv_imports_importedById_idx" ON "csv_imports"("importedById");
CREATE INDEX "csv_imports_userId_cardType_yearMonth_idx" ON "csv_imports"("userId", "cardType", "yearMonth");
CREATE UNIQUE INDEX "csv_imports_userId_fileHash_key" ON "csv_imports"("userId", "fileHash");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
