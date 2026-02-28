// ダッシュボード集計API — サマリー取得

import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { jsonOk } from "@/lib/api/response"
import { dashboardSummaryQuerySchema } from "@/lib/validations/dashboard"
import {
  aggregateMonthlyExpenses,
  aggregateByCategoryForMonth,
  calcCoupleRatio,
  aggregateMonthlyTrend,
  getBudgetSummary,
  getInstallmentSummary,
  getCsvImportStatus,
} from "@/lib/dashboard"

/** GET /api/dashboard/summary?yearMonth=YYYY-MM&months=6 */
export const GET = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  const url = new URL(request.url)
  const query = dashboardSummaryQuerySchema.parse({
    yearMonth: url.searchParams.get("yearMonth"),
    months: url.searchParams.get("months"),
  })

  // 現在は単一家計（2ユーザー）前提のため、集計は全件対象。
  // マルチテナント化時は userId による世帯スコープフィルタが必要。
  // Promise.all で並列実行。1つでも失敗すると 500 を返す（シンプル設計）。
  // 将来的に部分的な障害許容が必要になった場合は Promise.allSettled + degraded フラグを検討。
  const [
    monthly,
    categories,
    coupleRatio,
    trend,
    budget,
    installment,
    csvImport,
  ] = await Promise.all([
    aggregateMonthlyExpenses(query.yearMonth),
    aggregateByCategoryForMonth(query.yearMonth),
    calcCoupleRatio(query.yearMonth, userId),
    aggregateMonthlyTrend(query.months, query.yearMonth),
    getBudgetSummary(query.yearMonth),
    getInstallmentSummary(userId),
    getCsvImportStatus(query.yearMonth),
  ])

  return jsonOk({
    yearMonth: query.yearMonth,
    monthly,
    categories,
    coupleRatio,
    trend,
    budget,
    installment,
    csvImport,
  })
})
