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
} from "./types"

export {
  getDashboardSummary,
  type DashboardSummary,
} from "./get-dashboard-summary"
