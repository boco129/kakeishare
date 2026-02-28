"use client"

import { formatJPY, formatPercent } from "@/lib/chart-format"
import type { BudgetSummary } from "@/lib/dashboard"

type Props = {
  data: BudgetSummary
}

/** 予算消化率に応じた色クラスを返す */
function getBarColorClass(rate: number) {
  if (rate >= 100) return "bg-destructive"
  if (rate >= 80) return "bg-amber-500"
  return "bg-primary"
}

export function BudgetProgressBar({ data }: Props) {
  const rate = Math.max(0, Math.min(100, data.budgetUsageRate))

  if (data.totalBudget === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        予算が設定されていません
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>予算消化率</span>
        <span className="font-medium">{formatPercent(data.budgetUsageRate)}</span>
      </div>
      <div
        role="progressbar"
        aria-label="予算消化率"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(rate)}
        className="h-3 w-full rounded-full bg-muted"
      >
        <div
          className={`h-3 rounded-full transition-[width] duration-500 ${getBarColorClass(data.budgetUsageRate)}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatJPY(data.totalSpent)} 使用</span>
        <span>{formatJPY(data.totalBudget)} 予算</span>
      </div>
    </div>
  )
}
