// Phase 4: Claude AI連携の型定義

import type { Visibility } from "@/generated/prisma/enums"

/** AI分類の確信度 */
export type AIConfidence = "high" | "medium" | "low"

/** AI カテゴリ分類の結果（1件分） */
export type AICategoryResult = {
  /** 対象の支出ID */
  expenseId: string
  /** 分類先カテゴリID（分類不能の場合 null） */
  categoryId: string | null
  /** 分類の確信度 */
  confidence: AIConfidence
  /** 分類理由（デバッグ・監査用） */
  reasoning?: string
  /** カテゴリの defaultVisibility から導出される公開レベル */
  suggestedVisibility: Visibility
  /** 人間の確認済みフラグ（confidence === "low" なら false） */
  confirmed: boolean
}

/** AI分類のバッチ入力（Claude APIに渡す1件分） */
export type AICategoryInput = {
  /** 店舗名・利用内容 */
  description: string
  /** 金額（円） */
  amount: number
  /** 利用日 */
  date: string
}

/** Claude APIからのレスポンス（1件分、Zodで検証前の生データ） */
export type AICategoryRawOutput = {
  /** カテゴリ名（カテゴリID ではなく名前で返る） */
  category: string
  /** 確信度 */
  confidence: AIConfidence
  /** 分類理由 */
  reasoning?: string
}

/** AI Insights（削減提案+支出予測）の入力データ */
export type AIInsightsInput = {
  /** 対象年月（YYYY-MM） */
  yearMonth: string
  /** 直近6ヶ月の月次支出推移（昇順） */
  monthlyTrend: { yearMonth: string; total: number }[]
  /** カテゴリ別月次推移 */
  categoryTrend: {
    yearMonth: string
    categories: { category: string; amount: number; isFixedCost: boolean }[]
  }[]
  /** 対象月の予算 vs 実績 */
  budgetSummary: { category: string; budget: number; actual: number }[]
  /** 分割払い固定支出 */
  installments: { monthlyAmount: number; remainingMonths: number }[]
  /** データが存在する月数（信頼度判定に使用） */
  availableMonths: number
}

/** 削減提案1件 */
export type AISuggestionItem = {
  category: string
  currentAverage: number
  targetAmount: number
  savingAmount: number
  description: string
  priority: "high" | "medium" | "low"
}

/** カテゴリ別予測1件 */
export type AIForecastCategoryItem = {
  category: string
  predictedAmount: number
  reason: string
}

/** AI Insights のレスポンス（Claude JSON出力） */
export type AIInsightsOutput = {
  suggestions: AISuggestionItem[]
  forecast: {
    totalPredicted: number
    confidence: AIConfidence
    confidenceReason: string
    categories: AIForecastCategoryItem[]
  }
  summary: string
}

/** AI月次レポートの入力データ */
export type AIReportInput = {
  /** 対象年月（YYYY-MM） */
  yearMonth: string
  /** プライバシーフィルター適用済みの集計データ */
  summary: {
    totalAmount: number
    categoryBreakdown: { category: string; amount: number; count: number }[]
    coupleRatio: { user1: number; user2: number }
    budgetSummary: { category: string; budget: number; actual: number }[]
  }
}
