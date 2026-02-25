"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Visibility = "PUBLIC" | "AMOUNT_ONLY" | "CATEGORY_TOTAL"

export type ExpenseItem = {
  id: string
  userId: string
  date: string
  amount: number
  description: string
  categoryId: string | null
  visibility: Visibility
  memo: string | null
  isSubstitute: boolean
  actualAmount: number | null
  confirmed: boolean
  source: string
  category: { name: string; icon: string } | null
  masked: boolean
}

export type CategoryTotal = {
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  totalAmount: number
  count: number
}

export type ExpenseFiltersState = {
  yearMonth: string
  userId: string
  categoryId: string
  sortBy: "date" | "amount"
  sortOrder: "asc" | "desc"
}

type PaginationMeta = {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

/** 現在の年月を YYYY-MM 形式で返す */
function getCurrentYearMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function useExpenses() {
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState<ExpenseFiltersState>({
    yearMonth: getCurrentYearMonth(),
    userId: "",
    categoryId: "",
    sortBy: "date",
    sortOrder: "desc",
  })

  const abortRef = useRef<AbortController | null>(null)
  const reqIdRef = useRef(0)

  const fetchExpenses = useCallback(async (f: ExpenseFiltersState, page: number, append = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const reqId = ++reqIdRef.current

    if (!append) setLoading(true)

    try {
      const params = new URLSearchParams()
      if (f.yearMonth) params.set("yearMonth", f.yearMonth)
      if (f.userId) params.set("userId", f.userId)
      if (f.categoryId) params.set("categoryId", f.categoryId)
      params.set("sortBy", f.sortBy)
      params.set("sortOrder", f.sortOrder)
      params.set("page", String(page))
      params.set("limit", "20")

      const res = await fetch(`/api/expenses?${params}`, { signal: controller.signal })
      if (!res.ok) {
        toast.error("支出の取得に失敗しました")
        return
      }

      const json = await res.json()
      const newItems: ExpenseItem[] = (json.data?.items ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        date: typeof item.date === "string" ? item.date : String(item.date),
      }))

      if (append) {
        setItems((prev) => [...prev, ...newItems])
      } else {
        setItems(newItems)
      }
      setCategoryTotals(json.data?.categoryTotals ?? [])
      setMeta(json.meta ?? { page: 1, limit: 20, totalCount: 0, totalPages: 0 })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast.error("支出の取得に失敗しました")
      }
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }, [])

  // フィルタ変更時にデータ再取得
  useEffect(() => {
    void fetchExpenses(filters, 1)
    return () => abortRef.current?.abort()
  }, [filters, fetchExpenses])

  const updateFilter = useCallback((partial: Partial<ExpenseFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...partial }))
  }, [])

  const loadMore = useCallback(() => {
    if (meta.page < meta.totalPages) {
      void fetchExpenses(filters, meta.page + 1, true)
    }
  }, [meta, filters, fetchExpenses])

  const refresh = useCallback(() => {
    void fetchExpenses(filters, 1)
  }, [filters, fetchExpenses])

  return {
    items,
    categoryTotals,
    loading,
    meta,
    filters,
    updateFilter,
    loadMore,
    refresh,
    hasMore: meta.page < meta.totalPages,
  }
}
