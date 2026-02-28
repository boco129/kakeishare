// Phase 4: プロンプトテンプレート管理
// 各AI機能のシステムプロンプトを一元管理する

import type { AICategoryInput, AIReportInput } from "./types"

/** プロンプトバージョン管理 */
export const PROMPT_VERSIONS = {
  CLASSIFICATION: "v1",
  REPORT: "v1",
  CHAT: "v1",
} as const

/** デフォルトのカテゴリ一覧（DBから取得できない場合のフォールバック用） */
const DEFAULT_CATEGORY_LIST = [
  "食費",
  "日用品",
  "住居",
  "光熱費",
  "通信費",
  "交通費",
  "交際費",
  "衣服・美容",
  "医療",
  "教育",
  "個人娯楽",
  "サブスク",
  "保険",
  "自動車",
  "その他",
]

/** 1回のバッチ分類の最大件数 */
export const MAX_CLASSIFICATION_BATCH_SIZE = 100

/**
 * カテゴリ分類用システムプロンプトを生成する（要件定義書 §8.1 準拠）
 * @param categoryNames DBから取得したカテゴリ名一覧（省略時はデフォルト値を使用）
 */
export function buildCategorySystemPrompt(categoryNames?: string[]): string {
  const categories = categoryNames?.length
    ? categoryNames.map((v) => v.trim()).filter(Boolean)
    : DEFAULT_CATEGORY_LIST

  return `あなたは家計簿のカテゴリ分類アシスタントです。

## ルール
- 入力: JSON配列（各要素は {description, amount, date}）
- 出力: JSON配列のみ（説明文不要）。各要素は {category, confidence, reasoning} を満たすこと
- category: 以下のカテゴリ名のいずれかを正確に使用すること
  [${categories.join(", ")}]
- confidence: "high", "medium", "low" のいずれか
- reasoning: 分類理由を簡潔に記述（省略可）
- 入力配列と出力配列の要素数は必ず一致させること
- 不明な場合は「その他」を使用し、confidence を "low" にすること`
}

/**
 * カテゴリ分類用ユーザーメッセージを生成する
 * @throws 件数が MAX_CLASSIFICATION_BATCH_SIZE を超える場合
 */
export function buildCategoryUserMessage(inputs: AICategoryInput[]): string {
  if (inputs.length > MAX_CLASSIFICATION_BATCH_SIZE) {
    throw new Error(
      `分類バッチサイズが上限を超えています: ${inputs.length}件（上限: ${MAX_CLASSIFICATION_BATCH_SIZE}件）`
    )
  }
  return JSON.stringify(inputs)
}

/**
 * 月次レポート生成用システムプロンプトを生成する（要件定義書 §8.2 準拠）
 */
export function buildReportSystemPrompt(): string {
  return `あなたは夫婦の家計アドバイザーです。

## ルール
- 月次の家計データを分析し、日本語で簡潔なレビューを作成してください
- まずポジティブな点を挙げ、その後に建設的な改善提案をしてください
- 非公開カテゴリ（合計値のみ提供）の詳細は推測しないでください
- 夫婦の協力を促す前向きなトーンで書いてください
- 具体的な金額を根拠として示してください`
}

/**
 * 月次レポート用ユーザーメッセージを生成する
 */
export function buildReportUserMessage(input: AIReportInput): string {
  return `${input.yearMonth}の家計データです。分析をお願いします。\n\n${JSON.stringify(input.summary, null, 2)}`
}

/**
 * チャットアドバイザー用システムプロンプトを生成する（要件定義書 §8.3 準拠）
 */
export function buildChatSystemPrompt(): string {
  return `あなたは夫婦向け家計管理の専門アドバイザーです。

## ルール
- 家計データに基づいた具体的なアドバイスを提供してください
- 非公開カテゴリの詳細は推測しないでください
- 特定のパートナーを責めるような表現は避けてください
- 家族全体の改善に焦点を当ててください
- 提案には具体的な数字を含めてください
- 日本語で回答してください`
}

/**
 * チャットアドバイザー用ユーザーメッセージを生成する
 */
export function buildChatUserMessage(
  message: string,
  context?: string
): string {
  if (context) {
    return `## 家計データ\n${context}\n\n## 質問\n${message}`
  }
  return message
}
