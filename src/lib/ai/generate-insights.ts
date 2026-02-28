// AI Insights（削減提案 + 支出予測）生成サービス

import { getAnthropicClientSingleton, AI_MODELS } from "./client"
import { buildInsightsSystemPrompt, buildInsightsUserMessage } from "./prompts"
import { aiInsightsOutputSchema } from "./schemas"
import { logTokenUsage } from "./usage-logger"
import type { AIInsightsInput, AIInsightsOutput } from "./types"
import type { ReviewSummary } from "@/lib/dashboard"
import type { Env } from "@/lib/env-schema"

/** Insights 生成結果 */
export type GenerateInsightsResult = {
  insights: AIInsightsOutput
  tokenUsage: { inputTokens: number; outputTokens: number } | null
}

/**
 * ReviewSummary + isFixedCostマップ → AIInsightsInput に変換する
 * カテゴリ集計値のみを渡し、明細レベルの情報は含めない
 */
export function toAIInsightsInput(
  summary: ReviewSummary,
  fixedCostMap: Map<string, boolean>,
): AIInsightsInput {
  const availableMonths = summary.trend.length

  return {
    yearMonth: summary.yearMonth,
    monthlyTrend: summary.trend.map((t) => ({
      yearMonth: t.yearMonth,
      total: t.total,
    })),
    categoryTrend: summary.categoryTrend.map((entry) => ({
      yearMonth: entry.yearMonth,
      categories: entry.categories.map((c) => ({
        category: c.categoryName,
        amount: c.amount,
        isFixedCost: fixedCostMap.get(c.categoryId) ?? false,
      })),
    })),
    budgetSummary: summary.budget.categories
      .filter((c) => c.budget > 0)
      .map((c) => ({
        category: c.categoryName ?? "未分類",
        budget: c.budget,
        actual: c.spent,
      })),
    installments: summary.installment.items.map((i) => ({
      monthlyAmount: i.monthlyAmount,
      remainingMonths: i.remainingMonths,
    })),
    availableMonths,
  }
}

/**
 * AI Insights（削減提案 + 支出予測）を生成する
 */
export async function generateInsights(
  input: AIInsightsInput,
  env: Env,
): Promise<GenerateInsightsResult> {
  const client = getAnthropicClientSingleton(env)

  const response = await client.messages.create({
    model: AI_MODELS.REPORT,
    max_tokens: 2048,
    system: buildInsightsSystemPrompt(),
    messages: [{ role: "user", content: buildInsightsUserMessage(input) }],
  })

  // テキストブロックからJSON文字列を抽出
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()

  // JSONパース（コードブロック対策）
  let parsed: unknown
  try {
    const jsonStr = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error("AIインサイトの生成に失敗しました: JSONパースエラー")
  }

  // Zodバリデーション
  const validated = aiInsightsOutputSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(
      `AIインサイトの生成に失敗しました: 出力検証エラー — ${validated.error.message}`,
    )
  }

  const usage = logTokenUsage("insights", {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_creation_input_tokens:
      response.usage.cache_creation_input_tokens ?? undefined,
    cache_read_input_tokens:
      response.usage.cache_read_input_tokens ?? undefined,
  })

  return {
    insights: validated.data,
    tokenUsage: usage
      ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }
      : null,
  }
}
