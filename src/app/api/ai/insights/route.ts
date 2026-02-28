// AI Insights（削減提案+支出予測）生成 API
// POST /api/ai/insights — Claude Sonnet で家計分析インサイトを生成

import { z } from "zod"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { yearMonthSchema } from "@/lib/validations/year-month"
import { isAIAvailable } from "@/lib/ai"
import { getReviewSummary } from "@/lib/dashboard"
import { generateInsights, toAIInsightsInput } from "@/lib/ai/generate-insights"
import { consumeInsightsRateLimit } from "@/lib/ai/insights-rate-limit"
import { env } from "@/lib/env"
import { db } from "@/lib/db"

const requestSchema = z.object({
  yearMonth: yearMonthSchema,
})

/** POST /api/ai/insights — 削減提案+支出予測を生成 */
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
  const rateLimit = consumeInsightsRateLimit(userId)
  if (!rateLimit.allowed) {
    throw new ApiError(
      "FORBIDDEN",
      "AI分析の生成回数上限（月5回）に達しました",
      429,
    )
  }

  // 6ヶ月分の集計データ取得（categoryTrend含む）
  const summary = await getReviewSummary({
    yearMonth,
    months: 6,
    userId,
  })

  // カテゴリのisFixedCostマップを取得
  const categories = await db.category.findMany({
    select: { id: true, isFixedCost: true },
  })
  const fixedCostMap = new Map(categories.map((c) => [c.id, c.isFixedCost]))

  // AIInsightsInput変換 → Insights生成
  const insightsInput = toAIInsightsInput(summary, fixedCostMap)

  let result
  try {
    result = await generateInsights(insightsInput, env)
  } catch (e) {
    console.error("[ai.insights] 生成失敗:", e)
    throw new ApiError(
      "INTERNAL_ERROR",
      "AI分析の生成に失敗しました。時間をおいて再試行してください",
      503,
    )
  }

  return jsonOk({
    yearMonth,
    insights: result.insights,
    remaining: rateLimit.remaining,
    generatedAt: new Date().toISOString(),
  })
})
