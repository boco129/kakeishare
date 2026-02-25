"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExpenseFiltersState } from "./use-expenses"

type Category = {
  id: string
  name: string
  icon: string
}

type UserInfo = {
  id: string
  name: string
}

/** 月選択の候補を生成（過去12ヶ月） */
function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    options.push({ value, label })
  }
  return options
}

const monthOptions = generateMonthOptions()

export function ExpenseFilters({
  filters,
  onFilterChange,
  users,
}: {
  filters: ExpenseFiltersState
  onFilterChange: (partial: Partial<ExpenseFiltersState>) => void
  users: UserInfo[]
}) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch("/api/categories", { signal: controller.signal })
        if (!res.ok) return
        const json = await res.json()
        setCategories(json.data ?? [])
      } catch {
        // ignore
      }
    })()
    return () => controller.abort()
  }, [])

  return (
    <div className="flex flex-wrap gap-2">
      {/* 月選択 */}
      <Select
        value={filters.yearMonth}
        onValueChange={(v) => onFilterChange({ yearMonth: v })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ユーザーフィルタ */}
      <Select
        value={filters.userId || "__all__"}
        onValueChange={(v) => onFilterChange({ userId: v === "__all__" ? "" : v })}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全員</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* カテゴリフィルタ */}
      <Select
        value={filters.categoryId || "__all__"}
        onValueChange={(v) => onFilterChange({ categoryId: v === "__all__" ? "" : v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全カテゴリ</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.icon} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ソート */}
      <Select
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onValueChange={(v) => {
          const [sortBy, sortOrder] = v.split("-") as ["date" | "amount", "asc" | "desc"]
          onFilterChange({ sortBy, sortOrder })
        }}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-desc">日付（新しい順）</SelectItem>
          <SelectItem value="date-asc">日付（古い順）</SelectItem>
          <SelectItem value="amount-desc">金額（高い順）</SelectItem>
          <SelectItem value="amount-asc">金額（安い順）</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
