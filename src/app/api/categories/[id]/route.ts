// カテゴリ API — 更新 / 削除

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { categoryUpdateSchema } from "@/lib/validations/category"

/** PATCH /api/categories/[id] — カテゴリ部分更新（ADMINのみ） */
export const PATCH = withApiHandler(async (request, context) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "カテゴリの更新は管理者のみ可能です", 403)
  }

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "カテゴリIDが不正です", 400)
  }

  // 存在チェック
  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError("NOT_FOUND", "カテゴリが見つかりません", 404)
  }

  const body = await request.json()
  const input = categoryUpdateSchema.parse(body)

  const category = await db.category.update({
    where: { id },
    data: input,
  })

  return jsonOk(category)
})

/** DELETE /api/categories/[id] — カテゴリ削除（ADMINのみ、参照チェック付き） */
export const DELETE = withApiHandler(async (_request, context) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "カテゴリの削除は管理者のみ可能です", 403)
  }

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "カテゴリIDが不正です", 400)
  }

  // 存在チェック
  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError("NOT_FOUND", "カテゴリが見つかりません", 404)
  }

  // 参照チェック（支出・予算）
  const [expenseCount, budgetCount] = await db.$transaction([
    db.expense.count({ where: { categoryId: id } }),
    db.budget.count({ where: { categoryId: id } }),
  ])

  if (expenseCount > 0 || budgetCount > 0) {
    throw new ApiError(
      "CONFLICT",
      "このカテゴリは支出または予算に紐付いているため削除できません",
      409,
      { expenseCount, budgetCount },
    )
  }

  await db.category.delete({ where: { id } })

  return jsonOk({ id })
})
