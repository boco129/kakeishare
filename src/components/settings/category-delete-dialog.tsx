"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Category = {
  id: string
  name: string
  icon: string
}

export function CategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (!category) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      const json = await res.json()

      if (!res.ok) {
        // 409 CONFLICT: 紐付き支出・予算がある場合
        if (res.status === 409 && json.error?.details) {
          const { expenseCount, budgetCount } = json.error.details as {
            expenseCount: number
            budgetCount: number
          }
          const parts = []
          if (expenseCount > 0) parts.push(`${expenseCount}件の支出`)
          if (budgetCount > 0) parts.push(`${budgetCount}件の予算`)
          setError(
            `このカテゴリには${parts.join("と")}が紐付いています。先に紐付きを解除してください。`,
          )
        } else {
          setError(json.error?.message ?? "削除に失敗しました")
        }
        return
      }

      onSuccess()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  if (!category) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>カテゴリの削除</DialogTitle>
          <DialogDescription>
            「{category.icon} {category.name}」を削除してよろしいですか？
            この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
