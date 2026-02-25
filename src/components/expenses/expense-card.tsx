"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ExpenseItem } from "./use-expenses"

/** 金額をフォーマット */
function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

export function ExpenseCard({
  expense,
  currentUserId,
  users,
  onEdit,
  onDelete,
}: {
  expense: ExpenseItem
  currentUserId: string
  users: { id: string; name: string }[]
  onEdit: (expense: ExpenseItem) => void
  onDelete: (expense: ExpenseItem) => void
}) {
  const isOwn = expense.userId === currentUserId
  const userName = users.find((u) => u.id === expense.userId)?.name ?? ""

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
      {/* 確認状態 */}
      <div className="mt-0.5 shrink-0 text-lg">
        {expense.confirmed ? "✅" : "🟡"}
      </div>

      {/* メイン情報 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {expense.isSubstitute && (
            <Badge variant="outline" className="shrink-0 text-xs">🔄 立替</Badge>
          )}
          {expense.visibility !== "PUBLIC" && !isOwn && (
            <Badge variant="outline" className="shrink-0 text-xs">🔒</Badge>
          )}
          <span className="truncate font-medium">{expense.description}</span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {expense.category && (
            <span>{expense.category.icon} {expense.category.name}</span>
          )}
          <span>{userName}</span>
        </div>

        {expense.isSubstitute && expense.actualAmount != null && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            (自己負担 {formatAmount(expense.actualAmount)})
          </div>
        )}
      </div>

      {/* 金額 + アクション */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-semibold tabular-nums">
          {formatAmount(expense.amount)}
        </span>

        {isOwn && !expense.masked && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="支出を編集"
              onClick={() => onEdit(expense)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label="支出を削除"
              onClick={() => onDelete(expense)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
