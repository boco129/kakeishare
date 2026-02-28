// ダッシュボード集計ドメイン — 型定義

import type { Visibility } from "@/generated/prisma/enums"

/** YYYY-MM の月範囲（Date.UTC ベース） */
export type MonthRange = {
  start: Date
  end: Date
}

/** 月次支出集計 */
export type MonthlyAggregate = {
  yearMonth: string
  totalAmount: number
  count: number
}

/** カテゴリ別集計 */
export type CategoryBreakdown = {
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  amount: number
  percentage: number
  count: number
}

/** 夫婦比率 */
export type CoupleRatio = {
  user: CoupleRatioEntry
  partner: CoupleRatioEntry
}

export type CoupleRatioEntry = {
  userId: string
  name: string
  total: number
  percentage: number
}

/** 月次トレンド（直近N ヶ月） */
export type MonthlyTrend = {
  yearMonth: string
  total: number
}

/** 予算サマリー */
export type BudgetSummary = {
  totalBudget: number
  totalSpent: number
  remainingBudget: number
  budgetUsageRate: number
  categories: BudgetCategorySummary[]
}

export type BudgetCategorySummary = {
  categoryId: string | null
  categoryName: string | null
  budget: number
  spent: number
  remaining: number
}

/** 分割払いサマリー */
export type InstallmentSummary = {
  activeCount: number
  totalMonthlyAmount: number
  items: InstallmentItem[]
}

export type InstallmentItem = {
  id: string
  description: string
  totalAmount: number
  monthlyAmount: number
  remainingMonths: number
  remainingAmount: number
  progressRate: number
  visibility: Visibility
}

/** CSV取り込みステータス */
export type CsvImportStatus = {
  lastImportDate: Date | null
  pendingConfirmCount: number
  unimportedMonths: string[]
}
