// カテゴリ並び替え API — バッチで sortOrder を更新

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { categoryReorderSchema } from "@/lib/validations/category"

/** PATCH /api/categories/reorder — 並び替え（ADMINのみ） */
export const PATCH = withApiHandler(async (request) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "カテゴリの並び替えは管理者のみ可能です", 403)
  }

  const body = await request.json()
  const { ids } = categoryReorderSchema.parse(body)

  // 全カテゴリとの一致を検証（重複・欠落・不正ID防止）
  const allCategories = await db.category.findMany({ select: { id: true } })
  const allIds = new Set(allCategories.map((c) => c.id))
  const uniqueIds = new Set(ids)

  if (
    ids.length !== allCategories.length ||
    uniqueIds.size !== ids.length ||
    ids.some((id) => !allIds.has(id))
  ) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "全カテゴリのIDを重複なしで指定してください",
      400,
    )
  }

  // トランザクションで全カテゴリの sortOrder を一括更新
  await db.$transaction(
    ids.map((id, index) =>
      db.category.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  )

  return jsonOk({ updated: ids.length })
})
