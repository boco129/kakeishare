// 予算 API — 前月コピー

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { z } from "zod"
import { yearMonthSchema } from "@/lib/validations/year-month"

const copySchema = z.object({
  targetYearMonth: yearMonthSchema,
})

/** 前月 YYYY-MM を返す */
function prevYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** POST /api/budgets/copy — 前月の予算を当月にコピー（ADMINのみ） */
export const POST = withApiHandler(async (request) => {
  const { role } = await requireAuth()

  if (role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "予算のコピーは管理者のみ可能です", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }

  const { targetYearMonth } = copySchema.parse(body)
  const sourceYearMonth = prevYearMonth(targetYearMonth)

  const copied = await db.$transaction(async (tx) => {
    const source = await tx.budget.findMany({
      where: { yearMonth: sourceYearMonth },
    })

    if (source.length === 0) {
      throw new ApiError("NOT_FOUND", "前月の予算データがありません", 404)
    }

    // 当月の既存予算を削除してから上書き
    await tx.budget.deleteMany({ where: { yearMonth: targetYearMonth } })

    for (const b of source) {
      await tx.budget.create({
        data: {
          yearMonth: targetYearMonth,
          categoryId: b.categoryId,
          amount: b.amount,
        },
      })
    }

    return source.length
  })

  return jsonOk({ copied, yearMonth: targetYearMonth })
})
