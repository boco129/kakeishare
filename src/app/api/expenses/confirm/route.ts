// 支出一括確認 API

import { z } from "zod"
import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { recalcUnconfirmedCount } from "@/lib/csv/unconfirmed-count"

const confirmSchema = z.object({
  expenseIds: z.array(z.string().cuid()).min(1, "確認する支出IDを1件以上指定してください"),
})

/** PATCH /api/expenses/confirm — 支出を一括確認 */
export const PATCH = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }

  const { expenseIds } = confirmSchema.parse(body)

  // 対象の支出を取得し所有者チェック
  const expenses = await db.expense.findMany({
    where: { id: { in: expenseIds } },
    select: { id: true, userId: true, csvImportId: true },
  })

  // 存在しないIDチェック
  if (expenses.length !== expenseIds.length) {
    throw new ApiError("NOT_FOUND", "一部の支出が見つかりません", 404)
  }

  // 所有者チェック（全件が自分の支出であること）
  const notOwned = expenses.find((e) => e.userId !== userId)
  if (notOwned) {
    throw new ApiError("FORBIDDEN", "他人の支出は確認できません", 403)
  }

  // 一括更新
  await db.expense.updateMany({
    where: { id: { in: expenseIds } },
    data: { confirmed: true },
  })

  // 影響する csvImport の unconfirmedCount を再計算
  const csvImportIds = [
    ...new Set(
      expenses
        .map((e) => e.csvImportId)
        .filter((id): id is string => id !== null),
    ),
  ]

  for (const csvImportId of csvImportIds) {
    await recalcUnconfirmedCount(db, csvImportId)
  }

  return jsonOk({ confirmedCount: expenseIds.length })
})
