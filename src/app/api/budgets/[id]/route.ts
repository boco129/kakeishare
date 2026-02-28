// 予算 API — 更新 / 削除

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { budgetPatchSchema } from "@/lib/validations/budget"

/** PATCH /api/budgets/[id] — 予算金額の更新（ADMINのみ） */
export const PATCH = withApiHandler(async (request, context) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "予算の更新は管理者のみ可能です", 403)
  }

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "予算IDが不正です", 400)
  }

  // 存在チェック
  const existing = await db.budget.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError("NOT_FOUND", "予算が見つかりません", 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const input = budgetPatchSchema.parse(body)

  const budget = await db.budget.update({
    where: { id },
    data: { amount: input.amount },
    include: { category: { select: { id: true, name: true, icon: true } } },
  })

  return jsonOk(budget)
})

/** DELETE /api/budgets/[id] — 予算の削除（ADMINのみ） */
export const DELETE = withApiHandler(async (_request, context) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "予算の削除は管理者のみ可能です", 403)
  }

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "予算IDが不正です", 400)
  }

  // 存在チェック
  const existing = await db.budget.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError("NOT_FOUND", "予算が見つかりません", 404)
  }

  await db.budget.delete({ where: { id } })

  return jsonOk({ id })
})
