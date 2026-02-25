-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "dedupeHash" TEXT;

-- CreateIndex
CREATE INDEX "expenses_userId_dedupeHash_idx" ON "expenses"("userId", "dedupeHash");
