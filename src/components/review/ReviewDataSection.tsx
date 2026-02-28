// レビュー データセクション（Server Component）
// Suspense境界内で使用し、データフェッチ完了までスケルトンを表示

import { getReviewSummary } from "@/lib/dashboard"
import { isAIAvailable } from "@/lib/ai"
import { env } from "@/lib/env"
import { ReviewClient } from "./ReviewClient"

type Props = {
  yearMonth: string
  userId: string
}

export async function ReviewDataSection({ yearMonth, userId }: Props) {
  const data = await getReviewSummary({
    yearMonth,
    months: 6,
    userId,
  })

  return (
    <ReviewClient
      data={data}
      yearMonth={yearMonth}
      aiAvailable={isAIAvailable(env)}
    />
  )
}
