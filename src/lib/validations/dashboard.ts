// ダッシュボード集計APIバリデーションスキーマ

import { z } from "zod"
import { yearMonthSchema } from "./year-month"

/** ダッシュボードサマリー取得用クエリスキーマ */
export const dashboardSummaryQuerySchema = z.object({
  yearMonth: yearMonthSchema,
  months: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(1).max(24).default(6),
  ),
})

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>
