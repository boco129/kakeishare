"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatJPY } from "@/lib/chart-format"
import {
  listInstallments,
  createInstallment,
  updateInstallment,
  removeInstallment,
  type InstallmentItem,
  type InstallmentSummary,
} from "@/lib/api/installments"

type Props = {
  currentUserId: string
}

type FormData = {
  description: string
  totalAmount: string
  monthlyAmount: string
  totalMonths: string
  remainingMonths: string
  startDate: string
  visibility: "PUBLIC" | "AMOUNT_ONLY" | "CATEGORY_TOTAL"
  fee: string
}

const emptyForm: FormData = {
  description: "",
  totalAmount: "",
  monthlyAmount: "",
  totalMonths: "",
  remainingMonths: "",
  startDate: "",
  visibility: "PUBLIC",
  fee: "0",
}

/** 完済予定月を計算（開始日 + 全回数 - 1 で最終支払月を算出） */
function estimatedEndDate(startDate: string, totalMonths: number): string {
  const [y, m] = startDate.slice(0, 10).split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  d.setUTCMonth(d.getUTCMonth() + Math.max(totalMonths - 1, 0))
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`
}

/** ISO日付文字列からdate input用の値を取得（TZ安全） */
function toDateInputValue(dateLike: string): string {
  return dateLike.slice(0, 10)
}

/** ローカル日付をYYYY-MM-DD形式で返す（TZ安全） */
function todayLocalDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** プログレスバー色（支払い進捗に応じた色） */
function getProgressColor(rate: number) {
  if (rate >= 80) return "bg-primary"
  if (rate >= 50) return "bg-blue-500"
  return "bg-blue-400"
}

export function InstallmentManager({ currentUserId }: Props) {
  const [activeItems, setActiveItems] = useState<InstallmentItem[]>([])
  const [activeSummary, setActiveSummary] = useState<InstallmentSummary | null>(null)
  const [completedItems, setCompletedItems] = useState<InstallmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  // フォーム系
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<InstallmentItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")

  // 削除確認
  const [deleteTarget, setDeleteTarget] = useState<InstallmentItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [activeData, completedData] = await Promise.all([
        listInstallments("active"),
        listInstallments("completed"),
      ])
      setActiveItems(activeData.items)
      setActiveSummary(activeData.summary)
      setCompletedItems(completedData.items)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "データの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const canEdit = (item: InstallmentItem) => item.userId === currentUserId

  // 残債合計（表示可能分）
  const visibleRemainingTotal = activeItems.reduce((s, x) => s + x.remainingAmount, 0)

  // フォーム開閉
  const openCreateForm = () => {
    setEditTarget(null)
    setForm({ ...emptyForm, startDate: todayLocalDate() })
    setFormError("")
    setFormOpen(true)
  }

  const openEditForm = (item: InstallmentItem) => {
    if (!canEdit(item)) return
    setEditTarget(item)
    setForm({
      description: item.description,
      totalAmount: String(item.totalAmount),
      monthlyAmount: String(item.monthlyAmount),
      totalMonths: String(item.totalMonths),
      remainingMonths: String(item.remainingMonths),
      startDate: toDateInputValue(item.startDate),
      visibility: item.visibility,
      fee: String(item.fee),
    })
    setFormError("")
    setFormOpen(true)
  }

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError("")

    try {
      const totalAmount = Number(form.totalAmount)
      const monthlyAmount = Number(form.monthlyAmount)
      const totalMonths = Number(form.totalMonths)
      const remainingMonths =
        form.remainingMonths.trim() === "" ? totalMonths : Number(form.remainingMonths)
      const fee = form.fee.trim() === "" ? 0 : Number(form.fee)

      if (!form.description.trim()) {
        setFormError("説明を入力してください")
        return
      }
      if (!Number.isInteger(totalAmount) || totalAmount < 0) {
        setFormError("総額は0以上の整数を入力してください")
        return
      }
      if (!Number.isInteger(monthlyAmount) || monthlyAmount < 0) {
        setFormError("月額は0以上の整数を入力してください")
        return
      }
      if (!Number.isInteger(totalMonths) || totalMonths < 1) {
        setFormError("分割回数は1以上の整数を入力してください")
        return
      }
      if (!Number.isInteger(remainingMonths) || remainingMonths < 0) {
        setFormError("残回数は0以上の整数を入力してください")
        return
      }
      if (remainingMonths > totalMonths) {
        setFormError("残回数は分割回数以下で入力してください")
        return
      }
      if (!Number.isInteger(fee) || fee < 0) {
        setFormError("手数料は0以上の整数を入力してください")
        return
      }

      if (editTarget) {
        await updateInstallment(editTarget.id, {
          description: form.description.trim(),
          totalAmount,
          monthlyAmount,
          totalMonths,
          remainingMonths,
          startDate: form.startDate,
          visibility: form.visibility,
          fee,
        })
        toast.success("分割払いを更新しました")
      } else {
        await createInstallment({
          description: form.description.trim(),
          totalAmount,
          monthlyAmount,
          totalMonths,
          remainingMonths,
          startDate: form.startDate,
          visibility: form.visibility,
          fee,
        })
        toast.success("分割払いを登録しました")
      }

      setFormOpen(false)
      await reload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setFormLoading(false)
    }
  }

  // 削除
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeInstallment(deleteTarget.id)
      toast.success("分割払いを削除しました")
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー: 追加ボタン */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="size-4" />
          新規登録
        </Button>
      </div>

      {/* サマリー */}
      <div className="rounded-lg border p-4 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">残債合計</span>
          <span className="text-lg font-bold text-destructive">
            {formatJPY(visibleRemainingTotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">月々支払合計</span>
          <span className="text-sm font-medium">
            {formatJPY(activeSummary?.totalMonthlyAmount ?? 0)}
          </span>
        </div>
        {(activeSummary?.hiddenCount ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            ※ この他に非公開の分割払いが{activeSummary!.hiddenCount}件あります
          </p>
        )}
      </div>

      {/* アクティブ一覧 */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          アクティブな分割払い（{activeItems.length}件
          {(activeSummary?.hiddenCount ?? 0) > 0 &&
            ` / 全体 ${activeItems.length + activeSummary!.hiddenCount}件`}
          ）
        </h2>

        {activeItems.length === 0 ? (
          <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            アクティブな分割払いはありません
          </div>
        ) : (
          activeItems.map((item) => (
            <InstallmentCard
              key={item.id}
              item={item}
              canEdit={canEdit(item)}
              onEdit={() => openEditForm(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          ))
        )}
      </div>

      {/* 完了済み（折りたたみ） */}
      {completedItems.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span>完了済み（{completedItems.length}件）</span>
            {showCompleted ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {showCompleted &&
            completedItems.map((item) => (
              <InstallmentCard
                key={item.id}
                item={item}
                canEdit={canEdit(item)}
                onEdit={() => openEditForm(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
        </div>
      )}

      {/* 作成/編集ダイアログ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "分割払いを編集" : "分割払いを新規登録"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "分割払いの情報を変更します"
                : "新しい分割払いを登録します"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inst-desc">説明</Label>
              <Input
                id="inst-desc"
                value={form.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="例: ZARA オンラインストア"
                maxLength={200}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inst-total">総額</Label>
                <Input
                  id="inst-total"
                  type="number"
                  min={0}
                  value={form.totalAmount}
                  onChange={(e) => handleFormChange("totalAmount", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-monthly">月額</Label>
                <Input
                  id="inst-monthly"
                  type="number"
                  min={0}
                  value={form.monthlyAmount}
                  onChange={(e) => handleFormChange("monthlyAmount", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inst-total-months">分割回数</Label>
                <Input
                  id="inst-total-months"
                  type="number"
                  min={1}
                  value={form.totalMonths}
                  onChange={(e) => handleFormChange("totalMonths", e.target.value)}
                  placeholder="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-remaining">残回数</Label>
                <Input
                  id="inst-remaining"
                  type="number"
                  min={0}
                  value={form.remainingMonths}
                  onChange={(e) => handleFormChange("remainingMonths", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inst-start">開始日</Label>
                <Input
                  id="inst-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleFormChange("startDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-fee">手数料</Label>
                <Input
                  id="inst-fee"
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={(e) => handleFormChange("fee", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>公開レベル</Label>
              <Select
                value={form.visibility}
                onValueChange={(v) =>
                  handleFormChange("visibility", v)
                }
              >
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
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "保存中..." : editTarget ? "更新" : "登録"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分割払いの削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.description}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── 分割払いカード ──────────────────────────────────────

function InstallmentCard({
  item,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: InstallmentItem
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isCompleted = item.remainingMonths === 0
  const rate = Math.max(0, Math.min(100, item.progressRate))

  return (
    <Card className={isCompleted ? "opacity-60" : ""}>
      <CardContent className="py-3 space-y-2">
        {/* 1行目: 説明 + アクション */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{item.description}</p>
            <p className="text-xs text-muted-foreground">
              {item.userName ?? "不明"}
              {item.masked && " (金額のみ公開)"}
            </p>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" onClick={onDelete}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        {/* 2行目: 金額情報 */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            総額 {formatJPY(item.totalAmount)}
          </span>
          <span>
            月々 {formatJPY(item.monthlyAmount)} × 残{item.remainingMonths}回
          </span>
        </div>

        {/* プログレスバー */}
        <div className="space-y-1">
          <div
            role="progressbar"
            aria-label="支払い進捗"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(rate)}
            className="h-2 w-full rounded-full bg-muted"
          >
            <div
              className={`h-2 rounded-full transition-[width] duration-500 ${getProgressColor(rate)}`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {Math.round(rate)}% 完了
            </span>
            <span className="font-medium text-destructive">
              残 {formatJPY(item.remainingAmount)}
            </span>
          </div>
        </div>

        {/* 完済予定 */}
        {!isCompleted && (
          <p className="text-xs text-muted-foreground">
            完済予定: {estimatedEndDate(item.startDate, item.totalMonths)}
          </p>
        )}

        {/* 手数料 */}
        {item.fee > 0 && (
          <p className="text-xs text-muted-foreground">
            手数料: {formatJPY(item.fee)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
