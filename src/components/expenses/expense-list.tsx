"use client"

import { useMemo } from "react"
import { ExpenseCard } from "./expense-card"
import type { ExpenseItem } from "./use-expenses"

/** 日付を "1月30日（木）" 形式にフォーマット */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = weekdays[d.getDay()]
  return `${month}月${day}日（${weekday}）`
}

/** ISO日付文字列から YYYY-MM-DD 部分を取得 */
function toDateKey(dateStr: string): string {
  return dateStr.slice(0, 10)
}

export function ExpenseList({
  items,
  currentUserId,
  users,
  onEdit,
  onDelete,
}: {
  items: ExpenseItem[]
  currentUserId: string
  users: { id: string; name: string }[]
  onEdit: (expense: ExpenseItem) => void
  onDelete: (expense: ExpenseItem) => void
}) {
  // 日付別にグルーピング
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>()
    for (const item of items) {
      const key = toDateKey(item.date)
      const list = map.get(key)
      if (list) {
        list.push(item)
      } else {
        map.set(key, [item])
      }
    }
    // 日付の降順でソート済み（APIから降順で返る想定）
    return [...map.entries()]
  }, [items])

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        該当する支出がありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(([dateKey, expenses]) => (
        <div key={dateKey}>
          {/* 日付セパレーター */}
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {formatDateLabel(dateKey)}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* 日付内の支出 */}
          <div className="space-y-2">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                users={users}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
