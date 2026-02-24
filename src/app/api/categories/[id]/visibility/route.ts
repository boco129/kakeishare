// カテゴリ公開レベル設定 API — ユーザー別の公開レベルを更新

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { categoryVisibilityUpdateSchema } from "@/lib/validations/category"

/** PUT /api/categories/[id]/visibility — ユーザー別公開レベル更新 */
export const PUT = withApiHandler(async (request, context) => {
  const { userId } = await requireAuth()

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "カテゴリIDが不正です", 400)
  }

  // カテゴリ存在チェック
  const category = await db.category.findUnique({ where: { id } })
  if (!category) {
    throw new ApiError("NOT_FOUND", "カテゴリが見つかりません", 404)
  }

  const body = await request.json()
  const { visibility } = categoryVisibilityUpdateSchema.parse(body)

  // upsert: 既存なら更新、なければ作成
  const setting = await db.categoryVisibilitySetting.upsert({
    where: {
      userId_categoryId: { userId, categoryId: id },
    },
    update: { visibility },
    create: { userId, categoryId: id, visibility },
  })

  return jsonOk(setting)
})
