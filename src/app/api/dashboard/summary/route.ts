// ダッシュボード集計API — サマリー取得

import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { jsonOk } from "@/lib/api/response"
import { dashboardSummaryQuerySchema } from "@/lib/validations/dashboard"
import { getDashboardSummary } from "@/lib/dashboard"

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
  const data = await getDashboardSummary({
    yearMonth: query.yearMonth,
    months: query.months,
    userId,
  })

  return jsonOk(data)
})
