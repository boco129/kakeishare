"use client"

import { useMemo } from "react"
import type { ExpenseItem, CategoryTotal } from "./use-expenses"

/** 金額をフォーマット */
function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

export function ExpenseSummary({
  items,
  categoryTotals,
  currentUserId,
  users,
  totalCount,
}: {
  items: ExpenseItem[]
  categoryTotals: CategoryTotal[]
  currentUserId: string
  users: { id: string; name: string }[]
  totalCount: number
}) {
  // 表示中の明細の合計
  const itemsTotal = useMemo(
    () => items.reduce((sum, e) => sum + e.amount, 0),
    [items],
  )
  // CATEGORY_TOTAL 集計の合計
  const catTotalSum = useMemo(
    () => categoryTotals.reduce((sum, c) => sum + c.totalAmount, 0),
    [categoryTotals],
  )
  const grandTotal = itemsTotal + catTotalSum

  // ユーザー別小計（明細分のみ）
  const userTotals = useMemo(() => {
    const totals = new Map(users.map((u) => [u.id, 0]))
    for (const e of items) totals.set(e.userId, (totals.get(e.userId) ?? 0) + e.amount)
    return users.map((u) => ({ id: u.id, name: u.name, total: totals.get(u.id) ?? 0 }))
  }, [users, items])

  // 未確認件数
  const unconfirmedCount = useMemo(
    () => items.filter((e) => !e.confirmed && e.userId === currentUserId).length,
    [items, currentUserId],
  )

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">合計</span>
        <span className="text-xl font-bold tabular-nums">{formatAmount(grandTotal)}</span>
      </div>

      {/* ユーザー別小計 */}
      <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
        {userTotals.map((ut) => (
          <span key={ut.id}>
            {ut.name}: {formatAmount(ut.total)}
          </span>
        ))}
      </div>

      {/* フッター情報 */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{totalCount}件</span>
        {unconfirmedCount > 0 && (
          <span className="text-amber-600">未確認 {unconfirmedCount}件</span>
        )}
      </div>
    </div>
  )
}
