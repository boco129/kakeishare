// ダッシュボードサマリー取得 — API/RSC共通オーケストレータ

import {
  aggregateMonthlyExpenses,
  aggregateByCategoryForMonth,
  calcCoupleRatio,
  aggregateMonthlyTrend,
  getBudgetSummary,
  getInstallmentSummary,
  getCsvImportStatus,
} from "./aggregate"

type GetDashboardSummaryInput = {
  yearMonth: string
  months: number
  userId: string
}

export async function getDashboardSummary(input: GetDashboardSummaryInput) {
  const [monthly, categories, coupleRatio, trend, budget, installment, csvImport] =
    await Promise.all([
      aggregateMonthlyExpenses(input.yearMonth),
      aggregateByCategoryForMonth(input.yearMonth),
      calcCoupleRatio(input.yearMonth, input.userId),
      aggregateMonthlyTrend(input.months, input.yearMonth),
      getBudgetSummary(input.yearMonth),
      getInstallmentSummary(input.userId),
      getCsvImportStatus(input.yearMonth),
    ])

  // 前月比計算（trendは古い月→新しい月の昇順）
  const current = trend.at(-1)?.total ?? 0
  const previous = trend.length >= 2 ? (trend.at(-2)?.total ?? 0) : 0
  const diff = current - previous
  const ratio = previous > 0 ? Math.round(((diff) / previous) * 1000) / 10 : null

  return {
    yearMonth: input.yearMonth,
    monthly,
    categories,
    coupleRatio,
    trend,
    budget,
    installment,
    csvImport,
    monthlyComparison: { current, previous, diff, ratio },
  }
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>
