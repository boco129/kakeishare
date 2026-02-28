// ダッシュボード データセクション（Server Component）
// Suspense境界内で使用し、データフェッチ完了まで DashboardSkeleton を表示

import { getDashboardSummary } from "@/lib/dashboard"
import { DashboardClient } from "./DashboardClient"

type Props = {
  yearMonth: string
  userId: string
}

export async function DashboardDataSection({ yearMonth, userId }: Props) {
  const data = await getDashboardSummary({
    yearMonth,
    months: 6,
    userId,
  })

  return <DashboardClient data={data} />
}
