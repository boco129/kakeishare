// CSV取込カテゴリ自動分類サービス
// Claude Haiku でバッチ分類し、カテゴリ名→ID解決 + visibility自動付与を行う

import type { Visibility } from "@/generated/prisma/enums"
import { getAnthropicClientSingleton, AI_MODELS } from "./client"
import { aiCategoryBatchOutputSchema } from "./schemas"
import {
  MAX_CLASSIFICATION_BATCH_SIZE,
  buildCategorySystemPrompt,
  buildCategoryUserMessage,
} from "./prompts"
import { resolveCategoryId, type CategoryForResolver } from "./category-resolver"
import { logTokenUsage } from "./usage-logger"
import type { AICategoryInput, AICategoryResult, AIConfidence } from "./types"
import { resolveVisibilityBatch } from "@/lib/expenses"
import type { Env } from "@/lib/env-schema"

/** 分類結果の後処理オプション */
type PostProcessContext = {
  userId: string
  categories: CategoryForResolver[]
}

/**
 * confidence から confirmed フラグを決定する
 * high/medium → true、low → false（人間確認を促す）
 */
function confidenceToConfirmed(confidence: AIConfidence): boolean {
  return confidence !== "low"
}

/**
 * 支出をバッチ分類する
 *
 * @param env - 環境変数（ANTHROPIC_API_KEY を含む）
 * @param inputs - 分類対象の支出データ
 * @param expenseIds - inputs と同じ順序の支出ID配列
 * @param categories - DBから取得したカテゴリ一覧
 * @param userId - 支出オーナーのユーザーID（visibility解決用）
 * @returns 分類結果の配列（inputs と同じ順序）
 */
export async function classifyExpenses(
  env: Env,
  inputs: AICategoryInput[],
  expenseIds: string[],
  categories: CategoryForResolver[],
  userId: string,
): Promise<AICategoryResult[]> {
  if (inputs.length === 0) return []
  if (inputs.length !== expenseIds.length) {
    throw new Error(
      `inputs(${inputs.length}件)とexpenseIds(${expenseIds.length}件)の件数が一致しません`,
    )
  }

  const categoryNames = categories.map((c) => c.name)
  const allResults: AICategoryResult[] = []

  // チャンク分割してAPI呼び出し
  for (let i = 0; i < inputs.length; i += MAX_CLASSIFICATION_BATCH_SIZE) {
    const chunkInputs = inputs.slice(i, i + MAX_CLASSIFICATION_BATCH_SIZE)
    const chunkIds = expenseIds.slice(i, i + MAX_CLASSIFICATION_BATCH_SIZE)

    const chunkResults = await classifyChunk(
      env,
      chunkInputs,
      chunkIds,
      categoryNames,
      { userId, categories },
    )
    allResults.push(...chunkResults)
  }

  return allResults
}

/**
 * 1チャンク分のClaude API呼び出し + 後処理
 */
async function classifyChunk(
  env: Env,
  inputs: AICategoryInput[],
  expenseIds: string[],
  categoryNames: string[],
  ctx: PostProcessContext,
): Promise<AICategoryResult[]> {
  try {
    const client = getAnthropicClientSingleton(env)

    const response = await client.messages.create({
      model: AI_MODELS.CLASSIFICATION,
      max_tokens: 4096,
      system: buildCategorySystemPrompt(categoryNames),
      messages: [
        { role: "user", content: buildCategoryUserMessage(inputs) },
      ],
    })

    logTokenUsage("csv-classification", {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? undefined,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? undefined,
    })

    // テキストブロックからJSON抽出
    const textBlock = response.content.find((b) => b.type === "text")
    if (!textBlock || textBlock.type !== "text") {
      console.warn("[ai.classify] レスポンスにテキストブロックが見つかりません")
      return buildFallbackResults(expenseIds, ctx)
    }

    // JSONパース + Zodバリデーション
    let rawOutputs
    try {
      rawOutputs = aiCategoryBatchOutputSchema.parse(JSON.parse(textBlock.text))
    } catch (e) {
      console.warn("[ai.classify] レスポンスのパースに失敗:", e)
      return buildFallbackResults(expenseIds, ctx)
    }

    // 件数不一致チェック
    if (rawOutputs.length !== inputs.length) {
      console.warn(
        `[ai.classify] 入出力件数不一致: 入力${inputs.length}件, 出力${rawOutputs.length}件`,
      )
      return buildFallbackResults(expenseIds, ctx)
    }

    // カテゴリ名→ID解決 + visibility決定
    return await postProcessResults(rawOutputs, expenseIds, ctx)
  } catch (e) {
    console.error("[ai.classify] API呼び出しエラー:", e)
    return buildFallbackResults(expenseIds, ctx)
  }
}

/**
 * Claude APIの生出力を最終結果に変換する
 * - カテゴリ名→ID解決
 * - resolveVisibilityBatch で visibility 決定
 * - confidence → confirmed フラグ変換
 */
async function postProcessResults(
  rawOutputs: { category: string; confidence: AIConfidence; reasoning?: string }[],
  expenseIds: string[],
  ctx: PostProcessContext,
): Promise<AICategoryResult[]> {
  // 1. カテゴリ名→ID解決
  const resolved = rawOutputs.map((raw) =>
    resolveCategoryId(raw.category, ctx.categories),
  )

  // 2. resolveVisibilityBatch で一括 visibility 解決
  const categoryIds = resolved.map((r) => r.categoryId)
  const visibilityMap = await resolveVisibilityBatch(ctx.userId, categoryIds)

  // 3. 結果を組み立て
  return expenseIds.map((expenseId, i) => {
    const raw = rawOutputs[i]
    const res = resolved[i]
    const visibility: Visibility =
      res.categoryId ? (visibilityMap.get(res.categoryId) ?? "PUBLIC") : "PUBLIC"

    return {
      expenseId,
      categoryId: res.categoryId,
      confidence: raw.confidence,
      reasoning: raw.reasoning,
      suggestedVisibility: visibility,
      confirmed: confidenceToConfirmed(raw.confidence),
    }
  })
}

/**
 * エラー時のフォールバック結果を生成する
 * 全件「その他」カテゴリ + confidence: "low" + confirmed: false
 */
async function buildFallbackResults(
  expenseIds: string[],
  ctx: PostProcessContext,
): Promise<AICategoryResult[]> {
  // 「その他」カテゴリを探す
  const otherResult = resolveCategoryId("その他", ctx.categories)

  // visibility を解決
  const visibilityMap = otherResult.categoryId
    ? await resolveVisibilityBatch(ctx.userId, [otherResult.categoryId])
    : new Map<string, Visibility>()

  const visibility: Visibility = otherResult.categoryId
    ? (visibilityMap.get(otherResult.categoryId) ?? "PUBLIC")
    : "PUBLIC"

  return expenseIds.map((expenseId) => ({
    expenseId,
    categoryId: otherResult.categoryId,
    confidence: "low" as const,
    reasoning: "AI分類に失敗したためフォールバック",
    suggestedVisibility: visibility,
    confirmed: false,
  }))
}
