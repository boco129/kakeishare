// src/lib/db.seed.integration.test.ts
// Issue #21: Prisma schema / seed 整合性テスト（件数・制約・再実行性）

import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { seedDatabase } from "../../prisma/seed"

describe("prisma seed integrity", () => {
  // テスト用一時DBを作成（開発DBに影響しない）
  const dir = mkdtempSync(join(tmpdir(), "kakeishare-seed-"))
  const dbPath = join(dir, "seed-test.db")
  const dbUrl = `file:${dbPath}`

  let prisma: PrismaClient

  beforeAll(async () => {
    // テスト用DBにマイグレーションを適用
    execFileSync("pnpm", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
      cwd: join(import.meta.dirname, "../.."),
    })

    const adapter = new PrismaBetterSqlite3({ url: dbPath })
    prisma = new PrismaClient({ adapter })
  }, 30_000)

  afterAll(async () => {
    await prisma.$disconnect()
    rmSync(dir, { recursive: true, force: true })
  })

  // ============================================================
  // seed 後の件数検証テスト
  // ============================================================
  describe("seed後の件数検証", () => {
    beforeAll(async () => {
      await seedDatabase(prisma)
    })

    it("ユーザー: 2件", async () => {
      await expect(prisma.user.count()).resolves.toBe(2)
    })

    it("カテゴリ: 15件", async () => {
      await expect(prisma.category.count()).resolves.toBe(15)
    })

    it("カテゴリ公開レベル設定: 3件", async () => {
      await expect(prisma.categoryVisibilitySetting.count()).resolves.toBe(3)
    })

    it("支出: 44件", async () => {
      await expect(prisma.expense.count()).resolves.toBe(44)
    })

    it("予算: 28件", async () => {
      await expect(prisma.budget.count()).resolves.toBe(28)
    })

    it("分割払い: 3件", async () => {
      await expect(prisma.installment.count()).resolves.toBe(3)
    })

    it("CSV取り込み: 3件", async () => {
      await expect(prisma.csvImport.count()).resolves.toBe(3)
    })
  })

  // ============================================================
  // 参照整合性テスト
  // ============================================================
  describe("参照整合性", () => {
    it("全支出のuserIdが既存ユーザーを参照", async () => {
      const [users, expenses] = await Promise.all([
        prisma.user.findMany({ select: { id: true } }),
        prisma.expense.findMany({ select: { userId: true } }),
      ])
      const userIds = new Set(users.map((u) => u.id))

      for (const e of expenses) {
        expect(userIds.has(e.userId), `userId "${e.userId}" が存在しない`).toBe(true)
      }
    })

    it("全支出のcategoryIdが既存カテゴリを参照", async () => {
      const [categories, expenses] = await Promise.all([
        prisma.category.findMany({ select: { id: true } }),
        prisma.expense.findMany({ select: { id: true, categoryId: true } }),
      ])
      const categoryIds = new Set(categories.map((c) => c.id))

      for (const e of expenses) {
        expect(
          e.categoryId != null && categoryIds.has(e.categoryId),
          `expense "${e.id}" の categoryId "${e.categoryId}" が存在しない`
        ).toBe(true)
      }
    })

    it("全支出のcsvImportId（非null）が既存CSV取り込みを参照", async () => {
      const [imports, expenses] = await Promise.all([
        prisma.csvImport.findMany({ select: { id: true } }),
        prisma.expense.findMany({
          where: { csvImportId: { not: null } },
          select: { id: true, csvImportId: true },
        }),
      ])
      const importIds = new Set(imports.map((i) => i.id))

      for (const e of expenses) {
        expect(
          importIds.has(e.csvImportId!),
          `expense "${e.id}" の csvImportId "${e.csvImportId}" が存在しない`
        ).toBe(true)
      }
    })

    it("全分割払いのuserIdが既存ユーザーを参照", async () => {
      const [users, installments] = await Promise.all([
        prisma.user.findMany({ select: { id: true } }),
        prisma.installment.findMany({ select: { id: true, userId: true } }),
      ])
      const userIds = new Set(users.map((u) => u.id))

      for (const inst of installments) {
        expect(
          userIds.has(inst.userId),
          `installment "${inst.id}" の userId "${inst.userId}" が存在しない`
        ).toBe(true)
      }
    })

    it("全予算のcategoryIdが既存カテゴリを参照", async () => {
      const [categories, budgets] = await Promise.all([
        prisma.category.findMany({ select: { id: true } }),
        prisma.budget.findMany({ select: { id: true, categoryId: true } }),
      ])
      const categoryIds = new Set(categories.map((c) => c.id))

      for (const b of budgets) {
        expect(
          b.categoryId != null && categoryIds.has(b.categoryId),
          `budget "${b.id}" の categoryId "${b.categoryId}" が存在しない`
        ).toBe(true)
      }
    })
  })

  // ============================================================
  // 再実行冪等性テスト
  // ============================================================
  describe("再実行冪等性", () => {
    it("seedを2回実行しても件数が同一", async () => {
      // 1回目のseedは既にbeforeAllで実行済み
      const first = await prisma.$transaction([
        prisma.user.count(),
        prisma.category.count(),
        prisma.categoryVisibilitySetting.count(),
        prisma.expense.count(),
        prisma.budget.count(),
        prisma.installment.count(),
        prisma.csvImport.count(),
      ])

      // 2回目のseed実行
      await seedDatabase(prisma)

      const second = await prisma.$transaction([
        prisma.user.count(),
        prisma.category.count(),
        prisma.categoryVisibilitySetting.count(),
        prisma.expense.count(),
        prisma.budget.count(),
        prisma.installment.count(),
        prisma.csvImport.count(),
      ])

      expect(second).toEqual(first)
    })

    it("seedの再実行でエラーが発生しない", async () => {
      await expect(seedDatabase(prisma)).resolves.not.toThrow()
    })
  })
})
