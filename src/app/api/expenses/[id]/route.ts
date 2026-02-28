// 支出 API — 詳細取得 / 更新 / 削除

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { expenseUpdateSchema } from "@/lib/validations/expense"
import { filterExpenseForUser } from "@/lib/privacy"
import { resolveVisibility } from "@/lib/expenses"
import { recalcUnconfirmedCount } from "@/lib/csv/unconfirmed-count"

/** パスパラメータから id を安全に取得 */
async function extractId(context: { params?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await context.params
  const id = params?.id
  if (typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "支出IDが不正です", 400)
  }
  return id
}

/** GET /api/expenses/[id] — 支出詳細取得（プライバシーフィルター適用） */
export const GET = withApiHandler(async (_, context) => {
  const { userId } = await requireAuth()
  const id = await extractId(context)

  const expense = await db.expense.findUnique({
    where: { id },
    include: { category: { select: { name: true, icon: true } } },
  })

  if (!expense) {
    throw new ApiError("NOT_FOUND", "支出が見つかりません", 404)
  }

  // プライバシーフィルタ適用
  const filtered = filterExpenseForUser(expense, userId)
  if (!filtered) {
    // CATEGORY_TOTAL で個別明細にアクセス不可
    throw new ApiError("NOT_FOUND", "支出が見つかりません", 404)
  }

  return jsonOk(filtered)
})

/** PATCH /api/expenses/[id] — 支出更新（自分の支出のみ） */
export const PATCH = withApiHandler(async (request, context) => {
  const { userId } = await requireAuth()
  const id = await extractId(context)

  const expense = await db.expense.findUnique({ where: { id } })
  if (!expense) {
    throw new ApiError("NOT_FOUND", "支出が見つかりません", 404)
  }

  // 所有者チェック
  if (expense.userId !== userId) {
    throw new ApiError("FORBIDDEN", "他人の支出は編集できません", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const input = expenseUpdateSchema.parse(body)

  // カテゴリ変更時の存在チェック
  if (input.categoryId !== undefined && input.categoryId !== null) {
    const category = await db.category.findUnique({ where: { id: input.categoryId } })
    if (!category) {
      throw new ApiError("VALIDATION_ERROR", "指定されたカテゴリが存在しません", 400)
    }
  }

  // visibility の解決（明示指定があればそのまま、なければ既存値を維持）
  let visibility = expense.visibility
  if (input.visibility !== undefined) {
    visibility = input.visibility
  } else if (input.categoryId !== undefined) {
    // カテゴリ変更時は新カテゴリの visibility を自動適用
    visibility = await resolveVisibility(userId, input.categoryId)
  }

  // 立替フラグの処理
  const nextAmount = input.amount ?? expense.amount
  const isSubstitute = input.isSubstitute ?? expense.isSubstitute
  const actualAmount = isSubstitute
    ? (input.actualAmount !== undefined ? input.actualAmount : expense.actualAmount)
    : null

  // 自己負担額は支出額以下であること
  if (actualAmount != null && actualAmount > nextAmount) {
    throw new ApiError("VALIDATION_ERROR", "自己負担額は支出額以下にしてください", 400)
  }

  const updated = await db.expense.update({
    where: { id },
    data: {
      ...(input.date !== undefined && { date: input.date }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      visibility,
      isSubstitute,
      actualAmount,
      ...(input.memo !== undefined && { memo: input.memo }),
      ...(input.confirmed !== undefined && { confirmed: input.confirmed }),
    },
    include: { category: { select: { name: true, icon: true } } },
  })

  // csvImportId がある場合は unconfirmedCount を再計算
  if (expense.csvImportId) {
    await recalcUnconfirmedCount(db, expense.csvImportId)
  }

  return jsonOk(updated)
})

/** DELETE /api/expenses/[id] — 支出削除（自分の支出のみ） */
export const DELETE = withApiHandler(async (_, context) => {
  const { userId } = await requireAuth()
  const id = await extractId(context)

  const expense = await db.expense.findUnique({ where: { id } })
  if (!expense) {
    throw new ApiError("NOT_FOUND", "支出が見つかりません", 404)
  }

  // 所有者チェック
  if (expense.userId !== userId) {
    throw new ApiError("FORBIDDEN", "他人の支出は削除できません", 403)
  }

  await db.expense.delete({ where: { id } })

  // csvImportId がある場合は unconfirmedCount を再計算
  if (expense.csvImportId) {
    await recalcUnconfirmedCount(db, expense.csvImportId)
  }

  return jsonOk({ id })
})
