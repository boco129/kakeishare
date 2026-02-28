"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { ExpenseItem } from "./use-expenses"

export function UnconfirmedBanner({
  unconfirmedCount,
  items,
  currentUserId,
  onConfirmed,
}: {
  unconfirmedCount: number
  items: ExpenseItem[]
  currentUserId: string
  onConfirmed: () => void
}) {
  const [loading, setLoading] = useState(false)

  if (unconfirmedCount === 0) return null

  // 現在ページに表示されている自分の未確認支出のIDを収集
  const unconfirmedIds = items
    .filter((e) => e.userId === currentUserId && !e.confirmed)
    .map((e) => e.id)

  const handleConfirmAll = async () => {
    if (unconfirmedIds.length === 0) {
      toast.info("現在表示中の未確認支出はありません")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/expenses/confirm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: unconfirmedIds }),
      })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error?.message ?? "一括確認に失敗しました")
        return
      }

      const json = await res.json()
      toast.success(`${json.data.confirmedCount}件の支出を確認しました`)
      onConfirmed()
    } catch {
      toast.error("一括確認に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <span>🟡</span>
        <span>未確認の支出が <strong>{unconfirmedCount}件</strong> あります</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleConfirmAll}
        disabled={loading || unconfirmedIds.length === 0}
        className="gap-1"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3.5" />
        )}
        {unconfirmedIds.length > 0
          ? `表示中${unconfirmedIds.length}件を確認`
          : "一括確認"}
      </Button>
    </div>
  )
}
