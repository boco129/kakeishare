// 支出 API — 一覧取得 / 新規作成

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { expenseCreateSchema, expenseListQuerySchema } from "@/lib/validations/expense"
import { paginationSchema, calcPaginationMeta } from "@/lib/validations/pagination"
import { filterExpensesForUser } from "@/lib/privacy"
import { resolveVisibility } from "@/lib/expenses"
import type { Prisma } from "@/generated/prisma/client"

/** GET /api/expenses — 支出一覧（プライバシーフィルター + ソート + ページネーション） */
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

  // WHERE 条件を組み立て
  const where: Prisma.ExpenseWhereInput = {}

  if (yearMonth) {
    const [year, month] = yearMonth.split("-").map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    where.date = { gte: start, lt: end }
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (filterUserId) {
    where.userId = filterUserId
  }

  // 全件取得してプライバシーフィルタ適用（フィルタ後にソート＋ページング）
  const allExpenses = await db.expense.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    include: { category: { select: { name: true, icon: true } } },
  })

  const { items: filteredItems, categoryTotals } = filterExpensesForUser(allExpenses, userId)

  // ソート（フィルタ後に再ソートして整合性を保証）
  filteredItems.sort((a, b) => {
    const aVal = sortBy === "amount" ? a.amount : a.date.getTime()
    const bVal = sortBy === "amount" ? b.amount : b.date.getTime()
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal
  })

  // ページネーション（フィルタ後の件数基準）
  const totalCount = filteredItems.length
  const offset = (page - 1) * limit
  const pagedItems = filteredItems.slice(offset, offset + limit)

  return jsonOk(
    { items: pagedItems, categoryTotals },
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
