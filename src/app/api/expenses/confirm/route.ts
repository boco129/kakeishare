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

  // 重複IDを排除
  const uniqueIds = [...new Set(expenseIds)]

  // 対象の支出を取得（DBレベルで所有者制約）
  const expenses = await db.expense.findMany({
    where: { id: { in: uniqueIds }, userId },
    select: { id: true, csvImportId: true },
  })

  // 所有外・存在しないIDがあれば統一エラー（存在推測を防止）
  if (expenses.length !== uniqueIds.length) {
    throw new ApiError("NOT_FOUND", "支出が見つかりません", 404)
  }

  // 一括更新（所有者条件付き）
  await db.expense.updateMany({
    where: { id: { in: uniqueIds }, userId },
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

  return jsonOk({ confirmedCount: uniqueIds.length })
})
