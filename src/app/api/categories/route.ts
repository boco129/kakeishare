// カテゴリ API — 一覧取得 / 新規作成

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { categoryCreateSchema } from "@/lib/validations/category"

/** GET /api/categories — 全カテゴリ一覧（sortOrder順） + ユーザー別公開レベル */
export const GET = withApiHandler(async () => {
  const { userId } = await requireAuth()

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      visibilitySettings: {
        where: { userId },
      },
    },
  })

  // ユーザー別の公開レベル設定をマージして返す
  const data = categories.map((cat) => {
    const userSetting = cat.visibilitySettings[0]
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      isFixedCost: cat.isFixedCost,
      defaultVisibility: cat.defaultVisibility,
      userVisibility: userSetting?.visibility ?? cat.defaultVisibility,
      sortOrder: cat.sortOrder,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }
  })

  return jsonOk(data)
})

/** POST /api/categories — 新規カテゴリ作成（ADMINのみ） */
export const POST = withApiHandler(async (request) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "カテゴリの作成は管理者のみ可能です", 403)
  }

  const body = await request.json()
  const input = categoryCreateSchema.parse(body)

  // 新規カテゴリは末尾に追加
  const maxSort = await db.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })
  const sortOrder = (maxSort?.sortOrder ?? 0) + 1

  const category = await db.category.create({
    data: {
      name: input.name,
      icon: input.icon,
      isFixedCost: input.isFixedCost,
      defaultVisibility: input.defaultVisibility,
      sortOrder,
    },
  })

  return jsonOk(category)
})
