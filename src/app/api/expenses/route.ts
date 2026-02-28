// 支出 API — 一覧取得 / 新規作成

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { expenseCreateSchema, expenseListQuerySchema } from "@/lib/validations/expense"
import { paginationSchema, calcPaginationMeta } from "@/lib/validations/pagination"
import { filterExpenseForUser } from "@/lib/privacy/expense-filter"
import { VISIBLE_TO_OTHERS } from "@/lib/privacy/constants"
import { resolveVisibility } from "@/lib/expenses"
import type { Prisma } from "@/generated/prisma/client"

/** GET /api/expenses — 支出一覧（DB側ページネーション + プライバシーフィルター） */
export const GET = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams)

  const {
    yearMonth,
    categoryId,
    userId: filterUserId,
    sortBy = "date",
    sortOrder = "desc",
  } = expenseListQuerySchema.parse(params)
  const { page, limit } = paginationSchema.parse(params)

  // 基本WHERE条件を組み立て
  const baseWhere: Prisma.ExpenseWhereInput = {}

  if (yearMonth) {
    const [year, month] = yearMonth.split("-").map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    baseWhere.date = { gte: start, lt: end }
  }

  if (categoryId) {
    baseWhere.categoryId = categoryId
  }

  if (filterUserId) {
    baseWhere.userId = filterUserId
  }

  // 明細一覧用: 自分の支出は全て含む + 相手は表示可能なvisibilityのみ
  const visibleWhere: Prisma.ExpenseWhereInput = {
    AND: [
      baseWhere,
      {
        OR: [
          { userId },
          { visibility: { in: [...VISIBLE_TO_OTHERS] } },
        ],
      },
    ],
  }

  // カテゴリ集計用: 相手のCATEGORY_TOTAL支出のみ
  const categoryTotalWhere: Prisma.ExpenseWhereInput = {
    AND: [baseWhere, { visibility: "CATEGORY_TOTAL" }, { userId: { not: userId } }],
  }

  // 自分の支出のみ取得時はcategoryTotals集計不要（相手のCATEGORY_TOTALは存在しない）
  const needsCategoryTotals = filterUserId !== userId

  // ソート（第2キーにidを追加してページ跨ぎの安定性を保証）
  const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = [
    sortBy === "amount" ? { amount: sortOrder } : { date: sortOrder },
    { id: sortOrder },
  ]

  const offset = (page - 1) * limit

  // トランザクションでfindMany / count / groupByをまとめて整合性を保証
  const { rawItems, totalCount, categoryTotals } = await db.$transaction(async (tx) => {
    const [rawItems, totalCount, grouped] = await Promise.all([
      tx.expense.findMany({
        where: visibleWhere,
        orderBy,
        skip: offset,
        take: limit,
        include: { category: { select: { name: true, icon: true } } },
      }),
      tx.expense.count({ where: visibleWhere }),
      needsCategoryTotals
        ? tx.expense.groupBy({
            by: ["categoryId"],
            where: categoryTotalWhere,
            _sum: { amount: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ])

    // groupByのカテゴリIDからカテゴリ情報を取得
    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null)

    const categories = categoryIds.length
      ? await tx.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, icon: true },
        })
      : []

    const catMap = new Map(categories.map((c) => [c.id, c]))

    const categoryTotals = grouped
      .map((g) => ({
        categoryId: g.categoryId,
        categoryName: g.categoryId ? (catMap.get(g.categoryId)?.name ?? null) : null,
        categoryIcon: g.categoryId ? (catMap.get(g.categoryId)?.icon ?? null) : null,
        totalAmount: g._sum.amount ?? 0,
        count: g._count._all,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount || (a.categoryName ?? "").localeCompare(b.categoryName ?? ""))

    return { rawItems, totalCount, categoryTotals }
  })

  // アプリ側でAMOUNT_ONLYのマスク処理を適用
  // DB側で相手のCATEGORY_TOTALは除外済みだが、型安全のためnullをフィルタ
  const items = rawItems
    .map((e) => filterExpenseForUser(e, userId))
    .filter((e): e is NonNullable<typeof e> => e !== null)

  return jsonOk(
    { items, categoryTotals },
    calcPaginationMeta(page, limit, totalCount),
  )
})

/** POST /api/expenses — 支出登録（手入力） */
export const POST = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const input = expenseCreateSchema.parse(body)

  // カテゴリ存在チェック
  if (input.categoryId) {
    const category = await db.category.findUnique({ where: { id: input.categoryId } })
    if (!category) {
      throw new ApiError("VALIDATION_ERROR", "指定されたカテゴリが存在しません", 400)
    }
  }

  // visibility を解決（明示指定 → ユーザー別設定 → カテゴリデフォルト → PUBLIC）
  const visibility = await resolveVisibility(userId, input.categoryId, input.visibility)

  // 立替でない場合は actualAmount を null にクリア
  const actualAmount = input.isSubstitute ? (input.actualAmount ?? null) : null

  // 自己負担額は支出額以下であること
  if (actualAmount != null && actualAmount > input.amount) {
    throw new ApiError("VALIDATION_ERROR", "自己負担額は支出額以下にしてください", 400)
  }

  const expense = await db.expense.create({
    data: {
      userId,
      date: input.date,
      amount: input.amount,
      description: input.description,
      categoryId: input.categoryId ?? null,
      visibility,
      isSubstitute: input.isSubstitute,
      actualAmount,
      source: "MANUAL",
      confirmed: true,
      memo: input.memo ?? null,
    },
    include: { category: { select: { name: true, icon: true } } },
  })

  return jsonOk(expense)
})
