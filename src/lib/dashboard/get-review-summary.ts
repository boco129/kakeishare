// レビュー画面サマリー取得 — DashboardSummary + カテゴリ別推移

import { getDashboardSummary } from "./get-dashboard-summary"
import { aggregateCategoryTrend } from "./aggregate"

type GetReviewSummaryInput = {
  yearMonth: string
  months: number
  userId: string
}

export async function getReviewSummary(input: GetReviewSummaryInput) {
  const [base, categoryTrend] = await Promise.all([
    getDashboardSummary(input),
    aggregateCategoryTrend(input.months, input.yearMonth, 5),
  ])

  return { ...base, categoryTrend }
}

export type ReviewSummary = Awaited<ReturnType<typeof getReviewSummary>>
