"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type HistoryItem = {
  id: string
  cardType: string
  cardName: string
  yearMonth: string
  importedAt: string
  recordCount: number
  unconfirmedCount: number
  owner: { id: string; name: string }
  importedBy: { id: string; name: string }
}

export function CsvImportHistory({ yearMonth }: { yearMonth?: string }) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (yearMonth) params.set("yearMonth", yearMonth)
      params.set("limit", "10")

      const res = await fetch(`/api/csv-import/history?${params}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error("履歴の取得に失敗しました")
        return
      }
      setItems(json.data.items)
    } catch {
      toast.error("履歴の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [yearMonth])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        取り込み履歴はありません
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History className="size-4" />
        CSV取り込み履歴
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.cardName}</span>
                <Badge variant="outline" className="text-xs">
                  {item.yearMonth}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.owner.name}
                {" / "}
                {new Date(item.importedAt).toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium">{item.recordCount}件</span>
              {item.unconfirmedCount > 0 && (
                <span className="text-xs text-amber-600">
                  未確認 {item.unconfirmedCount}件
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
