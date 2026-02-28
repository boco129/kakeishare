// CSV取り込み後のAI分類ステップ
// DB保存済みの expense を取得 → AI分類 → 結果反映

import { db } from "@/lib/db"
import { isAIAvailable } from "@/lib/ai"
import { classifyExpenses } from "@/lib/ai/classify"
import { recalcUnconfirmedCount } from "./unconfirmed-count"
import { env } from "@/lib/env"
import type { CategoryForResolver } from "@/lib/ai/category-resolver"

/** AI分類ステップの結果 */
export type AiClassifyStepResult = {
  /** 分類された件数 */
  classifiedCount: number
  /** 未確認件数（confidence: low の件数） */
  unconfirmedCount: number
}

/**
 * CSV取り込み後にAI分類を実行する
 *
 * @param csvImportId - 対象の CSV取り込みID
 * @param userId - 支出オーナーのユーザーID
 * @returns 分類結果（AI不可時やエラー時は null）
 */
export async function runAiClassificationStep(
  csvImportId: string,
  userId: string,
): Promise<AiClassifyStepResult | null> {
  // AI利用可否チェック
  if (!isAIAvailable(env)) {
    console.info("[csv.ai-classify] ANTHROPIC_API_KEY 未設定のためAI分類をスキップ")
    return null
  }

  try {
    // DB保存済みのexpenseを取得（createMany順序に依存しない）
    const expenses = await db.expense.findMany({
      where: {
        csvImportId,
        aiCategorized: false,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
      },
      orderBy: { id: "asc" },
    })

    if (expenses.length === 0) return null

    // カテゴリ一覧を取得
    const categories: CategoryForResolver[] = await db.category.findMany({
      select: { id: true, name: true, defaultVisibility: true },
    })

    // AI分類用の入力データを生成
    const inputs = expenses.map((e) => ({
      description: e.description,
      amount: e.amount,
      date: e.date.toISOString().slice(0, 10),
    }))
    const expenseIds = expenses.map((e) => e.id)

    // AI分類実行
    const results = await classifyExpenses(env, inputs, expenseIds, categories, userId)

    // 結果をDBに反映 + unconfirmedCount 再計算をトランザクションで原子的に実行
    await db.$transaction(async (tx) => {
      for (const r of results) {
        await tx.expense.updateMany({
          where: { id: r.expenseId, aiCategorized: false },
          data: {
            categoryId: r.categoryId,
            visibility: r.suggestedVisibility,
            confirmed: r.confirmed,
            aiCategorized: true,
          },
        })
      }
      await recalcUnconfirmedCount(tx, csvImportId)
    })

    const unconfirmedCount = results.filter((r) => !r.confirmed).length

    return {
      classifiedCount: results.length,
      unconfirmedCount,
    }
  } catch (e) {
    console.error("[csv.ai-classify] AI分類ステップでエラー:", e)
    return null
  }
}

