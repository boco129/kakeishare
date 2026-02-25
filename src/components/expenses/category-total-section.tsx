"use client"

import type { CategoryTotal } from "./use-expenses"

/** 金額をフォーマット */
function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

export function CategoryTotalSection({
  categoryTotals,
}: {
  categoryTotals: CategoryTotal[]
}) {
  if (categoryTotals.length === 0) return null

  return (
    <div className="rounded-lg border p-4">
      {/* セクションヘッダー */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          非公開カテゴリ
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* カテゴリ別集計 */}
      <div className="space-y-2">
        {categoryTotals.map((ct) => (
          <div
            key={ct.categoryId ?? "__uncategorized__"}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {ct.categoryIcon && `${ct.categoryIcon} `}
              {ct.categoryName ?? "未分類"}
            </span>
            <span className="tabular-nums">
              {formatAmount(ct.totalAmount)}
              <span className="ml-1 text-xs text-muted-foreground">
                ({ct.count}件)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
