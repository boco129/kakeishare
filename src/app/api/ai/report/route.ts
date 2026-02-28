// 月次レポート生成 API
// POST /api/ai/report — Claude Sonnet で家計分析レポートを生成

import { z } from "zod"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { yearMonthSchema } from "@/lib/validations/year-month"
import { isAIAvailable } from "@/lib/ai"
import { getDashboardSummary } from "@/lib/dashboard"
import { generateMonthlyReport, toAIReportInput } from "@/lib/ai/generate-report"
import { consumeReportRateLimit } from "@/lib/ai/report-rate-limit"
import { env } from "@/lib/env"

const requestSchema = z.object({
  yearMonth: yearMonthSchema,
})

/** POST /api/ai/report — 月次レポートを生成 */
export const POST = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  // AI利用可能チェック
  if (!isAIAvailable(env)) {
    throw new ApiError("INTERNAL_ERROR", "AI機能が設定されていません", 503)
  }

  // リクエストパース
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const { yearMonth } = requestSchema.parse(body)

  // レート制限チェック（原子的にカウント消費）
  const rateLimit = consumeReportRateLimit(userId)
  if (!rateLimit.allowed) {
    throw new ApiError(
      "FORBIDDEN",
      "月次レポートの生成回数上限（月5回）に達しました",
      429,
    )
  }

  // 集計データ取得
  const summary = await getDashboardSummary({
    yearMonth,
    months: 1,
    userId,
  })

  // AIReportInput変換 → レポート生成
  const reportInput = toAIReportInput(summary)

  let result
  try {
    result = await generateMonthlyReport(reportInput, env)
  } catch {
    throw new ApiError(
      "INTERNAL_ERROR",
      "AIレポート生成に失敗しました。時間をおいて再試行してください",
      503,
    )
  }

  return jsonOk({
    yearMonth,
    report: result.report,
    remaining: rateLimit.remaining,
    generatedAt: new Date().toISOString(),
  })
})
