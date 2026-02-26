"use client"

import { useState, useCallback } from "react"
import { Plus, Loader2, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ExpenseForm, type ExpenseInitialValues } from "./expense-form"
import { ExpenseFilters } from "./expense-filters"
import { ExpenseList } from "./expense-list"
import { ExpenseSummary } from "./expense-summary"
import { CategoryTotalSection } from "./category-total-section"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { useExpenses, type ExpenseItem } from "./use-expenses"
import { CsvImportDialog } from "@/components/csv/csv-import-dialog"
import { CsvImportHistory } from "@/components/csv/csv-import-history"

type UserInfo = { id: string; name: string }

export function ExpensesPageClient({
  userLabel,
  currentUserId,
  users,
}: {
  userLabel: string
  currentUserId: string
  users: UserInfo[]
}) {
  const {
    items,
    categoryTotals,
    loading,
    meta,
    filters,
    updateFilter,
    loadMore,
    refresh,
    hasMore,
  } = useExpenses()

  // CSV取り込みダイアログ
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  // 追加ダイアログ
  const [addOpen, setAddOpen] = useState(false)

  // 編集ダイアログ
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExpenseInitialValues | null>(null)

  // 削除ダイアログ
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null)

  const handleEdit = useCallback((expense: ExpenseItem) => {
    setEditTarget({
      id: expense.id,
      date: expense.date.slice(0, 10),
      amount: expense.amount,
      categoryId: expense.categoryId ?? undefined,
      description: expense.description,
      memo: expense.memo ?? undefined,
      visibility: expense.visibility,
      isSubstitute: expense.isSubstitute,
      actualAmount: expense.actualAmount ?? undefined,
    })
    setEditOpen(true)
  }, [])

  const handleDelete = useCallback((expense: ExpenseItem) => {
    setDeleteTarget(expense)
    setDeleteOpen(true)
  }, [])

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">支出一覧</h1>
            <p className="text-sm text-muted-foreground">
              {userLabel}さんの支出
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
              <FileUp className="size-4" />
              CSV取込
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  追加
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>支出を追加</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                onSuccess={refresh}
                onClose={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* フィルタ */}
        <ExpenseFilters
          filters={filters}
          onFilterChange={updateFilter}
          users={users}
        />

        {/* サマリー */}
        <ExpenseSummary
          items={items}
          categoryTotals={categoryTotals}
          currentUserId={currentUserId}
          users={users}
          totalCount={meta.totalCount}
        />

        {/* 一覧 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ExpenseList
              items={items}
              currentUserId={currentUserId}
              users={users}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {/* CATEGORY_TOTAL 集計 */}
            <CategoryTotalSection categoryTotals={categoryTotals} />

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMore}>
                  もっと見る
                </Button>
              </div>
            )}
          </>
        )}

        {/* 編集ダイアログ */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>支出を編集</DialogTitle>
            </DialogHeader>
            {editTarget && (
              <ExpenseForm
                mode="edit"
                initialValues={editTarget}
                onSuccess={refresh}
                onClose={() => setEditOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <DeleteConfirmDialog
          expense={deleteTarget}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={refresh}
        />

        {/* CSV取り込みダイアログ */}
        <CsvImportDialog
          open={csvImportOpen}
          onOpenChange={setCsvImportOpen}
          users={users}
          onImported={refresh}
        />

        {/* CSV取り込み履歴 */}
        <CsvImportHistory yearMonth={filters.yearMonth} />
      </div>
    </div>
  )
}
