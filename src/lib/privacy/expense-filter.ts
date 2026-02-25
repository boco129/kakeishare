// プライバシーフィルタリング — visibility に応じた支出データのマスク処理

import type {
  CategoryTotal,
  ExpenseForPrivacy,
  FilteredExpense,
  FilteredExpenseResult,
} from "./types"

/** AMOUNT_ONLY 時に description を置き換えるラベル */
const PRIVATE_LABEL = "個人支出" as const

/**
 * 1件の支出にプライバシーフィルタを適用する
 *
 * - 自分の支出: 常に全フィールド返却
 * - PUBLIC: 全フィールド返却
 * - AMOUNT_ONLY: description を「個人支出」に置換、memo を null
 * - CATEGORY_TOTAL: null を返す（個別明細は返さない）
 */
export function filterExpenseForUser(
  expense: ExpenseForPrivacy,
  requestUserId: string,
): FilteredExpense | null {
  // 自分の支出は常に全詳細を返却
  if (expense.userId === requestUserId) {
    return { ...expense, masked: false }
  }

  switch (expense.visibility) {
    case "PUBLIC":
      return { ...expense, masked: false }

    case "AMOUNT_ONLY":
      return {
        id: expense.id,
        userId: expense.userId,
        date: expense.date,
        amount: expense.amount,
        categoryId: expense.categoryId,
        visibility: expense.visibility,
        description: PRIVATE_LABEL,
        memo: null,
        isSubstitute: false,
        actualAmount: null,
        confirmed: expense.confirmed,
        source: expense.source,
        category: expense.category,
        masked: true,
      }

    case "CATEGORY_TOTAL":
    default:
      // CATEGORY_TOTAL または未知の visibility は個別明細を返さない
      return null
  }
}

/**
 * CATEGORY_TOTAL の支出をカテゴリ別に集計する
 */
export function aggregateCategoryTotals(
  expenses: ExpenseForPrivacy[],
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()

  for (const e of expenses) {
    const key = e.categoryId ?? "__uncategorized__"
    const current = map.get(key)
    if (current) {
      current.totalAmount += e.amount
      current.count += 1
    } else {
      map.set(key, {
        categoryId: e.categoryId,
        categoryName: e.category?.name ?? null,
        categoryIcon: e.category?.icon ?? null,
        totalAmount: e.amount,
        count: 1,
      })
    }
  }

  return [...map.values()]
}

/**
 * 支出一覧にプライバシーフィルタを一括適用する
 *
 * 戻り値:
 * - items: フィルタ通過した明細（PUBLIC / AMOUNT_ONLY / 自分の支出）
 * - categoryTotals: CATEGORY_TOTAL の支出をカテゴリ別集計
 */
export function filterExpensesForUser(
  expenses: ExpenseForPrivacy[],
  requestUserId: string,
): FilteredExpenseResult {
  const items: FilteredExpense[] = []
  const hiddenForTotal: ExpenseForPrivacy[] = []

  for (const e of expenses) {
    const filtered = filterExpenseForUser(e, requestUserId)
    if (filtered) {
      items.push(filtered)
    } else {
      hiddenForTotal.push(e)
    }
  }

  return {
    items,
    categoryTotals: aggregateCategoryTotals(hiddenForTotal),
  }
}
