// 月次レポート生成サービス
// 既存の集計データ → AIReportInput変換 → Claude Sonnet で分析レポート生成

import { getAnthropicClientSingleton, AI_MODELS } from "./client"
import { buildReportSystemPrompt, buildReportUserMessage } from "./prompts"
import { logTokenUsage } from "./usage-logger"
import type { AIReportInput } from "./types"
import type { DashboardSummary } from "@/lib/dashboard"
import type { Env } from "@/lib/env-schema"

/** レポート生成結果 */
export type GenerateReportResult = {
  report: string
  tokenUsage: { inputTokens: number; outputTokens: number } | null
}

/**
 * DashboardSummary を AIReportInput に変換する
 * カテゴリ別合計値のみを渡し、明細レベルの情報は含めない
 */
export function toAIReportInput(summary: DashboardSummary): AIReportInput {
  return {
    yearMonth: summary.yearMonth,
    summary: {
      totalAmount: summary.monthly.totalAmount,
      categoryBreakdown: summary.categories.map((c) => ({
        category: c.categoryName ?? "未分類",
        amount: c.amount,
        count: c.count,
      })),
      coupleRatio: {
        user1: summary.coupleRatio.user.percentage,
        user2: summary.coupleRatio.partner.percentage,
      },
      budgetSummary: summary.budget.categories
        .filter((c) => c.budget > 0)
        .map((c) => ({
          category: c.categoryName ?? "未分類",
          budget: c.budget,
          actual: c.spent,
        })),
    },
  }
}

/**
 * 月次レポートを生成する
 *
 * @param input - プライバシー考慮済みの集計データ
 * @param env - 環境変数（ANTHROPIC_API_KEY を含む）
 * @returns レポート文章とtoken使用量
 */
export async function generateMonthlyReport(
  input: AIReportInput,
  env: Env,
): Promise<GenerateReportResult> {
  const client = getAnthropicClientSingleton(env)

  const response = await client.messages.create({
    model: AI_MODELS.REPORT,
    max_tokens: 1024,
    system: buildReportSystemPrompt(),
    messages: [
      { role: "user", content: buildReportUserMessage(input) },
    ],
  })

  // テキストブロックからレポート文章を抽出
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")

  if (text.trim().length < 10) {
    throw new Error("AIレポートの生成に失敗しました: レスポンスが短すぎます")
  }

  // token使用量を記録
  const usage = logTokenUsage("monthly-report", {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? undefined,
    cache_read_input_tokens: response.usage.cache_read_input_tokens ?? undefined,
  })

  return {
    report: text.trim(),
    tokenUsage: usage
      ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }
      : null,
  }
}
