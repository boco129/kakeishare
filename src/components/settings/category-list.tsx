"use client"

import { useState, useCallback } from "react"
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoryFormDialog } from "./category-form-dialog"
import { CategoryDeleteDialog } from "./category-delete-dialog"

type Category = {
  id: string
  name: string
  icon: string
  isFixedCost: boolean
  defaultVisibility: string
  userVisibility: string
  sortOrder: number
}

export function CategoryList({
  initialCategories,
  isAdmin,
}: {
  initialCategories: Category[]
  isAdmin: boolean
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [reordering, setReordering] = useState(false)

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories")
      if (res.ok) {
        const json = await res.json()
        setCategories(json.data)
      }
    } catch {
      // ネットワークエラーは静かに無視（次回操作時に再試行される）
    }
  }, [])

  const handleVisibilityChange = async (categoryId: string, visibility: string) => {
    const prev = categories
    // 楽観的更新
    setCategories((cats) =>
      cats.map((c) => (c.id === categoryId ? { ...c, userVisibility: visibility } : c)),
    )
    try {
      const res = await fetch(`/api/categories/${categoryId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      })
      if (!res.ok) {
        setCategories(prev) // ロールバック
      }
    } catch {
      setCategories(prev) // ロールバック
    }
  }

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const prev = categories
    const newCategories = [...categories]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newCategories.length) return

    ;[newCategories[index], newCategories[targetIndex]] = [
      newCategories[targetIndex],
      newCategories[index],
    ]
    setCategories(newCategories)
    setReordering(true)

    try {
      const res = await fetch("/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: newCategories.map((c) => c.id) }),
      })
      if (!res.ok) {
        setCategories(prev) // ロールバック
      }
    } catch {
      setCategories(prev) // ロールバック
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            公開レベルはカテゴリごとに設定できます
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4" />
            追加
          </Button>
        )}
      </div>

      {/* 公開レベルの凡例 */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-green-500" />
          公開: 全情報が見える
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-yellow-500" />
          金額のみ: 店舗名は非公開
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-red-500" />
          合計のみ: 明細は非公開
        </span>
      </div>

      {/* カテゴリ一覧 */}
      <div className="divide-y rounded-lg border">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* 並び替えボタン（ADMINのみ） */}
            {isAdmin && (
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${category.name}を上に移動`}
                  onClick={() => handleReorder(index, "up")}
                  disabled={index === 0 || reordering}
                >
                  <ChevronUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${category.name}を下に移動`}
                  onClick={() => handleReorder(index, "down")}
                  disabled={index === categories.length - 1 || reordering}
                >
                  <ChevronDown className="size-3" />
                </Button>
              </div>
            )}

            {/* アイコン + 名前 */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-lg">{category.icon}</span>
              <span className="truncate font-medium">{category.name}</span>
              {category.isFixedCost && (
                <Badge variant="secondary" className="text-[10px]">
                  固定費
                </Badge>
              )}
            </div>

            {/* 公開レベル設定 */}
            <Select
              value={category.userVisibility}
              onValueChange={(v) => handleVisibilityChange(category.id, v)}
            >
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-green-500" />
                    公開
                  </span>
                </SelectItem>
                <SelectItem value="AMOUNT_ONLY">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-yellow-500" />
                    金額のみ
                  </span>
                </SelectItem>
                <SelectItem value="CATEGORY_TOTAL">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-red-500" />
                    合計のみ
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 編集・削除ボタン（ADMINのみ） */}
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${category.name}を編集`}
                  onClick={() => setEditTarget(category)}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${category.name}を削除`}
                  onClick={() => setDeleteTarget(category)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            カテゴリがありません
          </div>
        )}
      </div>

      {/* 作成ダイアログ */}
      <CategoryFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refreshCategories}
      />

      {/* 編集ダイアログ */}
      <CategoryFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        category={editTarget ?? undefined}
        onSuccess={refreshCategories}
      />

      {/* 削除確認ダイアログ */}
      <CategoryDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        category={deleteTarget ?? undefined}
        onSuccess={refreshCategories}
      />
    </div>
  )
}
