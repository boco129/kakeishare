"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatJPY } from "@/lib/chart-format"
import {
  listBudgets,
  upsertBudget,
  patchBudget,
  deleteBudget,
  copyBudgets,
} from "@/lib/api/budgets"

type Row = {
  categoryId: string
  categoryName: string
  categoryIcon: string
  budgetId: string | null
  amount: number
  prevSpent: number
}

type OverallData = {
  id: string | null
  amount: number
  prevSpent: number
}

type Props = {
  isAdmin: boolean
  initialYearMonth: string
  initialOverall: OverallData
  initialRows: Row[]
}

function parseYearMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  return { year: y, month: m }
}

function formatYM(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function addMonth(ym: string, delta: number) {
  const { year, month } = parseYearMonth(ym)
  const d = new Date(year, month - 1 + delta, 1)
  return formatYM(d.getFullYear(), d.getMonth() + 1)
}

export function BudgetManager({
  isAdmin,
  initialYearMonth,
  initialOverall,
  initialRows,
}: Props) {
  const [yearMonth, setYearMonth] = useState(initialYearMonth)
  const [overall, setOverall] = useState<OverallData>(initialOverall)
  const [overallInput, setOverallInput] = useState(String(initialOverall.amount || ""))
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [rowInputs, setRowInputs] = useState<Record<string, string>>(
    Object.fromEntries(initialRows.map((r) => [r.categoryId, String(r.amount || "")])),
  )
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)

  const { year, month } = parseYearMonth(yearMonth)

  const categoryTotal = useMemo(
    () => rows.reduce((sum, r) => sum + r.amount, 0),
    [rows],
  )

  // 月切り替え時のデータ再取得
  const loadMonth = useCallback(async (ym: string) => {
    setLoading(true)
    try {
      // 当月予算と前月実績（支出集計）を並列取得
      const prevYm = addMonth(ym, -1)
      const [currentData, prevData] = await Promise.all([
        listBudgets(ym),
        listBudgets(prevYm),
      ])

      // 前月の実績は meta.spentByCategory から取得（予算未設定カテゴリも含む）
      const prevSpentMap = prevData.spentByCategory
      const prevTotalSpent = prevData.totalSpent

      // 全体予算
      const overallItem = currentData.items.find((item) => item.categoryId === null)
      setOverall({
        id: overallItem?.id ?? null,
        amount: overallItem?.amount ?? 0,
        prevSpent: prevTotalSpent,
      })
      setOverallInput(String(overallItem?.amount ?? ""))

      // カテゴリ予算マップ
      const budgetMap = new Map(
        currentData.items
          .filter((item) => item.categoryId !== null)
          .map((item) => [item.categoryId!, { id: item.id, amount: item.amount }]),
      )

      // 既存rowsのカテゴリを維持し予算額を更新
      const newRows = rows.map((r) => {
        const budget = budgetMap.get(r.categoryId)
        return {
          ...r,
          budgetId: budget?.id ?? null,
          amount: budget?.amount ?? 0,
          prevSpent: prevSpentMap[r.categoryId] ?? 0,
        }
      })

      setRows(newRows)
      setRowInputs(
        Object.fromEntries(newRows.map((r) => [r.categoryId, String(r.amount || "")])),
      )
      setYearMonth(ym)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "データの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [rows])

  // 全体予算の入力変更
  const handleOverallChange = (value: string) => {
    setOverallInput(value)
    const num = parseInt(value, 10)
    setOverall((prev) => ({ ...prev, amount: isNaN(num) ? 0 : num }))
  }

  // カテゴリ予算の入力変更
  const handleRowChange = (categoryId: string, value: string) => {
    setRowInputs((prev) => ({ ...prev, [categoryId]: value }))
    const num = parseInt(value, 10)
    setRows((prev) =>
      prev.map((r) =>
        r.categoryId === categoryId ? { ...r, amount: isNaN(num) ? 0 : num } : r,
      ),
    )
  }

  // 一括保存
  const saveAll = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      const jobs: Promise<unknown>[] = []

      // 全体予算
      if (overall.id && overall.amount === 0) {
        jobs.push(deleteBudget(overall.id))
      } else if (overall.id) {
        jobs.push(patchBudget(overall.id, overall.amount))
      } else if (overall.amount > 0) {
        jobs.push(upsertBudget({ yearMonth, categoryId: null, amount: overall.amount }))
      }

      // カテゴリ予算
      for (const r of rows) {
        if (r.budgetId && r.amount === 0) {
          jobs.push(deleteBudget(r.budgetId))
        } else if (r.budgetId) {
          jobs.push(patchBudget(r.budgetId, r.amount))
        } else if (r.amount > 0) {
          jobs.push(upsertBudget({ yearMonth, categoryId: r.categoryId, amount: r.amount }))
        }
      }

      await Promise.all(jobs)
      toast.success("予算を保存しました")

      // 保存後にデータを再取得してIDを更新
      await loadMonth(yearMonth)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  // 前月コピー実行
  const executeCopy = async () => {
    if (!isAdmin) return
    setCopying(true)
    setShowCopyConfirm(false)
    try {
      const result = await copyBudgets(yearMonth)
      toast.success(`前月の予算をコピーしました（${result.copied}件）`)
      await loadMonth(yearMonth)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "コピーに失敗しました")
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 月切り替え */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadMonth(addMonth(yearMonth, -1))}
          disabled={loading}
          aria-label="前月"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-bold">{year}年{month}月分</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadMonth(addMonth(yearMonth, 1))}
          disabled={loading}
          aria-label="翌月"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          読み込み中...
        </div>
      ) : (
        <>
          {/* 全体予算 */}
          <div className="space-y-2">
            <Label htmlFor="overall-budget">全体予算</Label>
            <Input
              id="overall-budget"
              type="number"
              min={0}
              value={overallInput}
              onChange={(e) => handleOverallChange(e.target.value)}
              disabled={!isAdmin}
              placeholder="0"
            />
            <p className={`text-xs ${overall.prevSpent > overall.amount ? "text-destructive" : "text-muted-foreground"}`}>
              先月実績: {formatJPY(overall.prevSpent)}
            </p>
          </div>

          {/* カテゴリ別予算 */}
          <div className="space-y-2">
            <Label>カテゴリ別予算</Label>
            <div className="divide-y rounded-lg border">
              {/* ヘッダー行 */}
              <div className="grid grid-cols-[1fr_120px_100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>カテゴリ</span>
                <span className="text-right">予算</span>
                <span className="text-right">先月実績</span>
              </div>

              {rows.map((row) => (
                <div
                  key={row.categoryId}
                  className="grid grid-cols-[1fr_120px_100px] items-center gap-2 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{row.categoryIcon}</span>
                    <span className="truncate text-sm">{row.categoryName}</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={rowInputs[row.categoryId] ?? ""}
                    onChange={(e) => handleRowChange(row.categoryId, e.target.value)}
                    disabled={!isAdmin}
                    placeholder="0"
                    className="h-8 text-right text-sm"
                  />
                  <div
                    className={`text-right text-xs ${
                      row.prevSpent > row.amount
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatJPY(row.prevSpent)}
                  </div>
                </div>
              ))}

              {rows.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  カテゴリがありません
                </div>
              )}

              {/* 合計行 */}
              {rows.length > 0 && (
                <div className="grid grid-cols-[1fr_120px_100px] items-center gap-2 bg-muted/50 px-3 py-2">
                  <span className="text-sm font-medium">合計</span>
                  <span className="text-right text-sm font-bold">
                    {formatJPY(categoryTotal)}
                  </span>
                  <span className="text-right text-xs text-muted-foreground">
                    {formatJPY(rows.reduce((sum, r) => sum + r.prevSpent, 0))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          {isAdmin && (
            <div className="flex gap-3">
              <Button onClick={saveAll} disabled={saving} className="flex-1">
                {saving ? "保存中..." : "保存する"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCopyConfirm(true)}
                disabled={copying}
              >
                <Copy className="size-4" />
                {copying ? "コピー中..." : "前月をコピー"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* 前月コピー確認ダイアログ */}
      <Dialog open={showCopyConfirm} onOpenChange={setShowCopyConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>前月の予算をコピー</DialogTitle>
            <DialogDescription>
              {year}年{month}月の予算を前月の設定で上書きします。現在の予算設定は削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyConfirm(false)}>
              キャンセル
            </Button>
            <Button onClick={executeCopy} disabled={copying}>
              {copying ? "コピー中..." : "上書きコピー"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
