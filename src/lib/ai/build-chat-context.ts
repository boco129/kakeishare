// チャットアドバイザー用コンテキスト生成
// ダッシュボード集計データをテキスト形式でまとめ、AIプロンプトに渡す
// プライバシー: カテゴリ集計値のみ（明細・店舗名・メモは含めない）

import { getDashboardSummary } from "@/lib/dashboard"

const JPY = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
}).format

/**
 * チャット用コンテキストを生成する
 * getDashboardSummary の集計データをコンパクトなテキストに変換する
 */
export async function buildChatContext(
  userId: string,
  yearMonth: string,
): Promise<string> {
  const summary = await getDashboardSummary({
    yearMonth,
    months: 3,
    userId,
  })

  const lines: string[] = []

  // 月次概要
  lines.push(`## ${yearMonth}の家計概要`)
  lines.push(
    `総支出: ${JPY(summary.monthly.totalAmount)}（${summary.monthly.count}件）`,
  )
  if (summary.monthlyComparison.ratio !== null) {
    const sign = summary.monthlyComparison.diff >= 0 ? "+" : ""
    lines.push(
      `前月比: ${sign}${JPY(summary.monthlyComparison.diff)}（${sign}${summary.monthlyComparison.ratio}%）`,
    )
  }

  // カテゴリ別
  if (summary.categories.length > 0) {
    lines.push("")
    lines.push("## カテゴリ別")
    for (const cat of summary.categories) {
      lines.push(
        `${cat.categoryName}: ${JPY(cat.amount)}（${cat.percentage}%）`,
      )
    }
  }

  // 予算状況
  const budgetWithAmount = summary.budget.categories.filter(
    (b) => b.budget > 0,
  )
  if (budgetWithAmount.length > 0) {
    lines.push("")
    lines.push("## 予算状況")
    lines.push(
      `総予算: ${JPY(summary.budget.totalBudget)} / 使用: ${JPY(summary.budget.totalSpent)}（${summary.budget.budgetUsageRate}%）`,
    )
    for (const b of budgetWithAmount) {
      const rate = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0
      lines.push(
        `${b.categoryName}: ${JPY(b.spent)}/${JPY(b.budget)}（${rate}%）`,
      )
    }
  }

  // 夫婦負担割合（個人名は送信しない — PIIを外部AIに渡さない）
  if (summary.coupleRatio) {
    lines.push("")
    lines.push("## 夫婦負担割合")
    lines.push(
      `あなた: ${summary.coupleRatio.user.percentage}% / パートナー: ${summary.coupleRatio.partner.percentage}%`,
    )
  }

  // 分割払い
  if (summary.installment.activeCount > 0) {
    lines.push("")
    lines.push("## 分割払い")
    lines.push(
      `月額合計: ${JPY(summary.installment.totalMonthlyAmount)}（${summary.installment.activeCount}件）`,
    )
  }

  return lines.join("\n")
}
