// ダッシュボード集計ドメイン — 公開API

export {
  toMonthRange,
  getPastMonths,
  aggregateMonthlyExpenses,
  aggregateByCategoryForMonth,
  calcCoupleRatio,
  aggregateMonthlyTrend,
  getBudgetSummary,
  getInstallmentSummary,
  getCsvImportStatus,
  aggregateCategoryTrend,
} from "./aggregate"

export type {
  MonthRange,
  MonthlyAggregate,
  CategoryBreakdown,
  CoupleRatio,
  CoupleRatioEntry,
  MonthlyTrend,
  BudgetSummary,
  BudgetCategorySummary,
  InstallmentSummary,
  InstallmentItem,
  CsvImportStatus,
  CategoryTrendEntry,
} from "./types"

export {
  getDashboardSummary,
  type DashboardSummary,
} from "./get-dashboard-summary"

export {
  getReviewSummary,
  type ReviewSummary,
} from "./get-review-summary"
