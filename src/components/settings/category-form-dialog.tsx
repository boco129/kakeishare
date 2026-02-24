"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  isFixedCost: boolean
  defaultVisibility: string
}

const EMOJI_OPTIONS = [
  "📦", "🍽", "🏪", "🏠", "💡", "📱", "🚃", "🍻",
  "👗", "🏥", "📚", "🎮", "🔄", "🛡", "🚗", "💰",
  "🎁", "✈️", "🏋️", "🐾",
]

export function CategoryFormDialog({
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
  const isEdit = !!category

  const [name, setName] = useState("")
  const [icon, setIcon] = useState("📦")
  const [isFixedCost, setIsFixedCost] = useState(false)
  const [defaultVisibility, setDefaultVisibility] = useState("PUBLIC")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ダイアログ開閉時にフォームをリセット
  useEffect(() => {
    if (open && category) {
      setName(category.name)
      setIcon(category.icon)
      setIsFixedCost(category.isFixedCost)
      setDefaultVisibility(category.defaultVisibility)
    } else if (open) {
      setName("")
      setIcon("📦")
      setIsFixedCost(false)
      setDefaultVisibility("PUBLIC")
    }
    setError("")
  }, [open, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const body = { name, icon, isFixedCost, defaultVisibility }
    const url = isEdit ? `/api/categories/${category.id}` : "/api/categories"
    const method = isEdit ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? "エラーが発生しました")
        return
      }

      onSuccess()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "カテゴリ編集" : "カテゴリ追加"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "カテゴリの情報を変更します"
              : "新しいカテゴリを追加します"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* カテゴリ名 */}
          <div className="space-y-2">
            <Label htmlFor="name">カテゴリ名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 食費"
              maxLength={30}
              required
            />
          </div>

          {/* アイコン選択 */}
          <div className="space-y-2">
            <Label>アイコン</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`アイコン ${emoji}`}
                  aria-pressed={icon === emoji}
                  onClick={() => setIcon(emoji)}
                  className={`flex size-9 items-center justify-center rounded-md border text-lg transition-colors ${
                    icon === emoji
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 固定費フラグ */}
          <div className="flex items-center gap-2">
            <input
              id="isFixedCost"
              type="checkbox"
              checked={isFixedCost}
              onChange={(e) => setIsFixedCost(e.target.checked)}
              className="size-4 rounded border accent-primary"
            />
            <Label htmlFor="isFixedCost">固定費</Label>
          </div>

          {/* デフォルト公開レベル */}
          <div className="space-y-2">
            <Label>デフォルト公開レベル</Label>
            <Select value={defaultVisibility} onValueChange={setDefaultVisibility}>
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              CSV取り込み時に自動適用される公開レベルです
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : isEdit ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
