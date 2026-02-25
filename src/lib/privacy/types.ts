// プライバシーフィルタリング用の型定義

import type { Visibility, ExpenseSource } from "@/generated/prisma/enums"

/** フィルタリング対象の支出データ（Prisma Expense から必要フィールドを抽出） */
export type ExpenseForPrivacy = {
  id: string
  userId: string
  date: Date
  amount: number
  description: string
  categoryId: string | null
  visibility: Visibility
  memo: string | null
  isSubstitute: boolean
  actualAmount: number | null
  confirmed: boolean
  source: ExpenseSource
  category: { name: string; icon: string } | null
}

/** フィルタリング済み支出（maskedフラグで型を判別可能） */
export type FilteredExpense =
  | (ExpenseForPrivacy & { masked: false })
  | (Omit<ExpenseForPrivacy, "description" | "memo"> & {
      description: string
      memo: null
      masked: true
    })

/** CATEGORY_TOTAL 用のカテゴリ別集計 */
export type CategoryTotal = {
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  totalAmount: number
  count: number
}

/** filterExpensesForUser の戻り値 */
export type FilteredExpenseResult = {
  items: FilteredExpense[]
  categoryTotals: CategoryTotal[]
}
