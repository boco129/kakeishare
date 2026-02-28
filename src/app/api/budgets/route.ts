// 予算 API — 一覧取得 / 新規作成（upsert）

import { db } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { budgetCreateSchema, budgetListQuerySchema } from "@/lib/validations/budget"
import { toMonthRange } from "@/lib/dashboard"

/** GET /api/budgets?yearMonth=YYYY-MM — 予算一覧＋実績額 */
export const GET = withApiHandler(async (request) => {
  await requireAuth()

  const url = new URL(request.url)
  const query = budgetListQuerySchema.parse({
    yearMonth: url.searchParams.get("yearMonth"),
  })

  const { start, end } = toMonthRange(query.yearMonth)

  // 予算一覧 + カテゴリ別実績を並列取得
  const [budgets, grouped] = await db.$transaction([
    db.budget.findMany({
      where: { yearMonth: query.yearMonth },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: start, lt: end } },
      orderBy: { categoryId: "asc" },
      _sum: { amount: true },
    }),
  ])

  // 実績マップ: categoryId → spent
  const spentByCategory = new Map(
    grouped.map((g) => [g.categoryId, g._sum?.amount ?? 0]),
  )
  const totalSpent = grouped.reduce(
    (sum, g) => sum + (g._sum?.amount ?? 0),
    0,
  )

  // 全体予算(categoryId=null)のspentはtotalSpent、カテゴリ予算はカテゴリ別実績
  const items = budgets.map((b) => ({
    id: b.id,
    yearMonth: b.yearMonth,
    categoryId: b.categoryId,
    categoryName: b.category?.name ?? null,
    categoryIcon: b.category?.icon ?? null,
    amount: b.amount,
    spent: b.categoryId === null ? totalSpent : (spentByCategory.get(b.categoryId) ?? 0),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }))

  // meta にカテゴリ別実績を含める（予算未設定カテゴリの実績も返す）
  const spentByCategoryMeta = Object.fromEntries(
    grouped.map((g) => [g.categoryId ?? "__total__", g._sum?.amount ?? 0]),
  )

  return jsonOk(items, { spentByCategory: spentByCategoryMeta, totalSpent })
})

/** POST /api/budgets — 予算作成/更新（upsertパターン、ADMINのみ） */
export const POST = withApiHandler(async (request) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "予算の作成は管理者のみ可能です", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const input = budgetCreateSchema.parse(body)

  // カテゴリ存在チェック（非nullの場合）
  if (input.categoryId) {
    const category = await db.category.findUnique({
      where: { id: input.categoryId },
    })
    if (!category) {
      throw new ApiError("NOT_FOUND", "指定されたカテゴリが見つかりません", 404)
    }
  }

  let budget

  if (input.categoryId) {
    // カテゴリ予算: Prisma upsert（@@unique が保証）
    budget = await db.budget.upsert({
      where: {
        yearMonth_categoryId: {
          yearMonth: input.yearMonth,
          categoryId: input.categoryId,
        },
      },
      update: { amount: input.amount },
      create: {
        yearMonth: input.yearMonth,
        categoryId: input.categoryId,
        amount: input.amount,
      },
      include: { category: { select: { id: true, name: true, icon: true } } },
    })
  } else {
    // 全体予算(categoryId=null): NULL一意性問題を回避するためtransaction内で処理
    // 競合時はcreate失敗をcatchしてupdateにフォールバック
    budget = await db.$transaction(async (tx) => {
      const existing = await tx.budget.findFirst({
        where: { yearMonth: input.yearMonth, categoryId: null },
      })
      if (existing) {
        return tx.budget.update({
          where: { id: existing.id },
          data: { amount: input.amount },
          include: { category: { select: { id: true, name: true, icon: true } } },
        })
      }
      try {
        return await tx.budget.create({
          data: {
            yearMonth: input.yearMonth,
            categoryId: null,
            amount: input.amount,
          },
          include: { category: { select: { id: true, name: true, icon: true } } },
        })
      } catch (e) {
        // P2002（一意制約違反）のみフォールバック、それ以外はrethrow
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e
        const conflict = await tx.budget.findFirst({
          where: { yearMonth: input.yearMonth, categoryId: null },
        })
        if (!conflict) throw new ApiError("INTERNAL_ERROR", "予算の作成に失敗しました", 500)
        return tx.budget.update({
          where: { id: conflict.id },
          data: { amount: input.amount },
          include: { category: { select: { id: true, name: true, icon: true } } },
        })
      }
    })
  }

  return jsonOk(budget)
})
