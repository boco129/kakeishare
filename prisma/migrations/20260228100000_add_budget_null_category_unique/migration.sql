-- 全体予算（categoryId IS NULL）の重複を防止する部分ユニーク制約
CREATE UNIQUE INDEX "budgets_yearMonth_null_category_unique" ON "budgets"("yearMonth") WHERE "categoryId" IS NULL;
