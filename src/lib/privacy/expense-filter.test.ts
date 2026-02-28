import { describe, expect, it } from "vitest"
import {
  filterExpenseForUser,
  filterExpensesForUser,
  aggregateCategoryTotals,
} from "./expense-filter"
import type { ExpenseForPrivacy } from "./types"
import { Visibility, ExpenseSource } from "@/generated/prisma/enums"

// ヘルパー: デフォルト値付きの支出データ生成
function makeExpense(
  overrides: Partial<ExpenseForPrivacy> = {},
): ExpenseForPrivacy {
  return {
    id: "exp-1",
    userId: "user-a",
    date: new Date("2026-01-15"),
    amount: 1500,
    description: "テスト店舗",
    categoryId: "cat-food",
    visibility: Visibility.PUBLIC,
    memo: "テストメモ",
    isSubstitute: true,
    actualAmount: 1300,
    confirmed: true,
    source: ExpenseSource.MANUAL,
    category: { name: "食費", icon: "utensils" },
    ...overrides,
  }
}

const ME = "user-a"
const OTHER = "user-b"

// ---------- filterExpenseForUser ----------

describe("filterExpenseForUser", () => {
  describe("自分の支出", () => {
    it("PUBLIC → 全フィールド返却、masked: false", () => {
      const expense = makeExpense({ userId: ME, visibility: Visibility.PUBLIC })
      const result = filterExpenseForUser(expense, ME)

      expect(result).not.toBeNull()
      expect(result!.masked).toBe(false)
      expect(result!.description).toBe("テスト店舗")
      expect(result!.memo).toBe("テストメモ")
    })

    it("AMOUNT_ONLY → visibility に関係なく全フィールド返却", () => {
      const expense = makeExpense({
        userId: ME,
        visibility: Visibility.AMOUNT_ONLY,
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).not.toBeNull()
      expect(result!.masked).toBe(false)
      expect(result!.description).toBe("テスト店舗")
      expect(result!.memo).toBe("テストメモ")
    })

    it("CATEGORY_TOTAL → visibility に関係なく全フィールド返却", () => {
      const expense = makeExpense({
        userId: ME,
        visibility: Visibility.CATEGORY_TOTAL,
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).not.toBeNull()
      expect(result!.masked).toBe(false)
      expect(result!.description).toBe("テスト店舗")
    })
  })

  describe("相手の支出", () => {
    it("PUBLIC → 全フィールド返却、masked: false", () => {
      const expense = makeExpense({
        userId: OTHER,
        visibility: Visibility.PUBLIC,
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).not.toBeNull()
      expect(result!.masked).toBe(false)
      expect(result!.description).toBe("テスト店舗")
      expect(result!.memo).toBe("テストメモ")
      expect(result!.amount).toBe(1500)
    })

    it("AMOUNT_ONLY → description が「個人支出」に置換、memo が null", () => {
      const expense = makeExpense({
        userId: OTHER,
        visibility: Visibility.AMOUNT_ONLY,
        description: "秘密の店",
        memo: "秘密のメモ",
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).not.toBeNull()
      expect(result!.masked).toBe(true)
      expect(result!.description).toBe("個人支出")
      expect(result!.memo).toBeNull()
      // 金額・日付・カテゴリは保持
      expect(result!.amount).toBe(1500)
      expect(result!.date).toEqual(new Date("2026-01-15"))
      expect(result!.categoryId).toBe("cat-food")
      expect(result!.category).toEqual({ name: "食費", icon: "utensils" })
    })

    it("AMOUNT_ONLY → isSubstitute=false / actualAmount=null に強制上書き", () => {
      const expense = makeExpense({
        userId: OTHER,
        visibility: Visibility.AMOUNT_ONLY,
        isSubstitute: true,
        actualAmount: 1000,
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).not.toBeNull()
      expect(result!.masked).toBe(true)
      expect(result!.isSubstitute).toBe(false)
      expect(result!.actualAmount).toBeNull()
    })

    it("CATEGORY_TOTAL → null を返す", () => {
      const expense = makeExpense({
        userId: OTHER,
        visibility: Visibility.CATEGORY_TOTAL,
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).toBeNull()
    })

    it("未知の visibility → null を返す（default ケース）", () => {
      const expense = makeExpense({
        userId: OTHER,
        visibility: "UNKNOWN" as Visibility,
      })
      const result = filterExpenseForUser(expense, ME)

      expect(result).toBeNull()
    })
  })
})

// ---------- aggregateCategoryTotals ----------

describe("aggregateCategoryTotals", () => {
  it("同一カテゴリの支出を合算する", () => {
    const expenses = [
      makeExpense({ amount: 1000, categoryId: "cat-food", category: { name: "食費", icon: "utensils" } }),
      makeExpense({ amount: 2000, categoryId: "cat-food", category: { name: "食費", icon: "utensils" } }),
    ]
    const result = aggregateCategoryTotals(expenses)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      categoryId: "cat-food",
      categoryName: "食費",
      categoryIcon: "utensils",
      totalAmount: 3000,
      count: 2,
    })
  })

  it("異なるカテゴリは別々に集計される", () => {
    const expenses = [
      makeExpense({ amount: 1000, categoryId: "cat-food", category: { name: "食費", icon: "utensils" } }),
      makeExpense({ amount: 500, categoryId: "cat-transport", category: { name: "交通費", icon: "train" } }),
    ]
    const result = aggregateCategoryTotals(expenses)

    expect(result).toHaveLength(2)
    const food = result.find((r) => r.categoryId === "cat-food")
    const transport = result.find((r) => r.categoryId === "cat-transport")
    expect(food!.totalAmount).toBe(1000)
    expect(transport!.totalAmount).toBe(500)
  })

  it("categoryId が null の場合は未分類として集計される", () => {
    const expenses = [
      makeExpense({ amount: 800, categoryId: null, category: null }),
      makeExpense({ amount: 200, categoryId: null, category: null }),
    ]
    const result = aggregateCategoryTotals(expenses)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      categoryId: null,
      categoryName: null,
      categoryIcon: null,
      totalAmount: 1000,
      count: 2,
    })
  })

  it("空リストは空配列を返す", () => {
    const result = aggregateCategoryTotals([])
    expect(result).toEqual([])
  })
})

// ---------- filterExpensesForUser ----------

describe("filterExpensesForUser", () => {
  it("混在リストで正しくフィルタリングされる", () => {
    const expenses = [
      makeExpense({ id: "1", userId: ME, visibility: Visibility.CATEGORY_TOTAL }),
      makeExpense({ id: "2", userId: OTHER, visibility: Visibility.PUBLIC }),
      makeExpense({ id: "3", userId: OTHER, visibility: Visibility.AMOUNT_ONLY }),
      makeExpense({ id: "4", userId: OTHER, visibility: Visibility.CATEGORY_TOTAL, amount: 3000 }),
    ]

    const result = filterExpensesForUser(expenses, ME)

    // items: 自分のCATEGORY_TOTAL(全詳細) + 相手のPUBLIC + 相手のAMOUNT_ONLY = 3件
    expect(result.items).toHaveLength(3)
    expect(result.items.map((i) => i.id)).toEqual(["1", "2", "3"])

    // AMOUNT_ONLY のマスク確認
    const maskedItem = result.items.find((i) => i.id === "3")!
    expect(maskedItem.masked).toBe(true)
    expect(maskedItem.description).toBe("個人支出")

    // categoryTotals: 相手のCATEGORY_TOTAL = 1件
    expect(result.categoryTotals).toHaveLength(1)
    expect(result.categoryTotals[0].totalAmount).toBe(3000)
  })

  it("CATEGORY_TOTAL の支出がカテゴリ合計に含まれる", () => {
    const expenses = [
      makeExpense({
        id: "1",
        userId: OTHER,
        visibility: Visibility.CATEGORY_TOTAL,
        amount: 1000,
        categoryId: "cat-food",
        category: { name: "食費", icon: "utensils" },
      }),
      makeExpense({
        id: "2",
        userId: OTHER,
        visibility: Visibility.CATEGORY_TOTAL,
        amount: 2000,
        categoryId: "cat-food",
        category: { name: "食費", icon: "utensils" },
      }),
    ]

    const result = filterExpensesForUser(expenses, ME)

    expect(result.items).toHaveLength(0)
    expect(result.categoryTotals).toHaveLength(1)
    expect(result.categoryTotals[0]).toEqual({
      categoryId: "cat-food",
      categoryName: "食費",
      categoryIcon: "utensils",
      totalAmount: 3000,
      count: 2,
    })
  })

  it("カテゴリ未設定の CATEGORY_TOTAL 支出の扱い", () => {
    const expenses = [
      makeExpense({
        userId: OTHER,
        visibility: Visibility.CATEGORY_TOTAL,
        amount: 500,
        categoryId: null,
        category: null,
      }),
    ]

    const result = filterExpensesForUser(expenses, ME)

    expect(result.items).toHaveLength(0)
    expect(result.categoryTotals).toHaveLength(1)
    expect(result.categoryTotals[0].categoryId).toBeNull()
    expect(result.categoryTotals[0].categoryName).toBeNull()
    expect(result.categoryTotals[0].totalAmount).toBe(500)
  })

  it("AMOUNT_ONLY は filterExpensesForUser 経由でも機微フィールドをマスクする", () => {
    const expenses = [
      makeExpense({
        id: "m1",
        userId: OTHER,
        visibility: Visibility.AMOUNT_ONLY,
        memo: "secret",
        isSubstitute: true,
        actualAmount: 999,
      }),
    ]
    const { items } = filterExpensesForUser(expenses, ME)

    expect(items).toHaveLength(1)
    expect(items[0].memo).toBeNull()
    expect(items[0].isSubstitute).toBe(false)
    expect(items[0].actualAmount).toBeNull()
  })

  it("未知の visibility は categoryTotals の集計対象になる", () => {
    const expenses = [
      makeExpense({
        userId: OTHER,
        visibility: "UNKNOWN" as Visibility,
        amount: 777,
        categoryId: "cat-misc",
        category: { name: "その他", icon: "box" },
      }),
    ]
    const result = filterExpensesForUser(expenses, ME)

    expect(result.items).toHaveLength(0)
    expect(result.categoryTotals).toHaveLength(1)
    expect(result.categoryTotals[0].totalAmount).toBe(777)
  })

  it("空リストの場合", () => {
    const result = filterExpensesForUser([], ME)

    expect(result.items).toEqual([])
    expect(result.categoryTotals).toEqual([])
  })
})
