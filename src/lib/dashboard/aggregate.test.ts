import { describe, expect, it, vi, beforeEach } from "vitest"

// db モジュールをモック
vi.mock("@/lib/db", () => ({
  db: {
    expense: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    budget: {
      findMany: vi.fn(),
    },
    installment: {
      findMany: vi.fn(),
    },
    csvImport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import {
  toMonthRange,
  getPastMonths,
  aggregateMonthlyExpenses,
  aggregateByCategoryForMonth,
  calcCoupleRatio,
  aggregateMonthlyTrend,
  getBudgetSummary,
  getInstallmentSummary,
  getCsvImportStatus,
  aggregateCategoryTrend,
} from "./aggregate"
import { db } from "@/lib/db"

const mockExpenseAggregate = vi.mocked(db.expense.aggregate)
const mockExpenseGroupBy = vi.mocked(db.expense.groupBy)
const mockExpenseFindMany = vi.mocked(db.expense.findMany)
const mockExpenseCount = vi.mocked(db.expense.count)
const mockCategoryFindMany = vi.mocked(db.category.findMany)
const mockUserFindMany = vi.mocked(db.user.findMany)
const mockBudgetFindMany = vi.mocked(db.budget.findMany)
const mockInstallmentFindMany = vi.mocked(db.installment.findMany)
const mockCsvImportFindFirst = vi.mocked(db.csvImport.findFirst)
const mockCsvImportFindMany = vi.mocked(db.csvImport.findMany)

beforeEach(() => {
  vi.resetAllMocks()
})

// ============================================================
// ユーティリティ
// ============================================================

describe("toMonthRange", () => {
  it("YYYY-MM を月初〜翌月初の Date 範囲に変換する", () => {
    const range = toMonthRange("2026-01")
    expect(range.start).toEqual(new Date(2026, 0, 1))
    expect(range.end).toEqual(new Date(2026, 1, 1))
  })

  it("12月は翌年1月が end になる", () => {
    const range = toMonthRange("2025-12")
    expect(range.start).toEqual(new Date(2025, 11, 1))
    expect(range.end).toEqual(new Date(2026, 0, 1))
  })
})

describe("getPastMonths", () => {
  it("指定基準月から N ヶ月分の YYYY-MM を降順で返す", () => {
    const result = getPastMonths(3, "2026-03")
    expect(result).toEqual(["2026-03", "2026-02", "2026-01"])
  })

  it("年をまたぐ場合も正しく計算する", () => {
    const result = getPastMonths(3, "2026-02")
    expect(result).toEqual(["2026-02", "2026-01", "2025-12"])
  })
})

// ============================================================
// aggregateMonthlyExpenses
// ============================================================

describe("aggregateMonthlyExpenses", () => {
  it("全 visibility の支出を含めた月次合計を返す", async () => {
    mockExpenseAggregate.mockResolvedValue({
      _sum: { amount: 250000 },
      _count: { _all: 30 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    const result = await aggregateMonthlyExpenses("2026-01")

    expect(result).toEqual({
      yearMonth: "2026-01",
      totalAmount: 250000,
      count: 30,
    })
    // WHERE条件にvisibilityフィルタがないことを確認
    expect(mockExpenseAggregate).toHaveBeenCalledWith({
      where: { date: { gte: expect.any(Date), lt: expect.any(Date) } },
      _sum: { amount: true },
      _count: { _all: true },
    })
  })

  it("支出がない月は 0 を返す", async () => {
    mockExpenseAggregate.mockResolvedValue({
      _sum: { amount: null },
      _count: { _all: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    const result = await aggregateMonthlyExpenses("2026-06")

    expect(result.totalAmount).toBe(0)
    expect(result.count).toBe(0)
  })
})

// ============================================================
// aggregateByCategoryForMonth
// ============================================================

describe("aggregateByCategoryForMonth", () => {
  it("カテゴリ別に金額・割合・件数を返す", async () => {
    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: "cat-food", _sum: { amount: 60000 }, _count: { _all: 15 } },
      { categoryId: "cat-transport", _sum: { amount: 40000 }, _count: { _all: 10 } },
    ] as never)

    mockCategoryFindMany.mockResolvedValue([
      { id: "cat-food", name: "食費", icon: "🍽️" },
      { id: "cat-transport", name: "交通費", icon: "🚃" },
    ] as never)

    const result = await aggregateByCategoryForMonth("2026-01")

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      categoryId: "cat-food",
      categoryName: "食費",
      categoryIcon: "🍽️",
      amount: 60000,
      percentage: 60.0,
      count: 15,
    })
    expect(result[1].percentage).toBe(40.0)
  })

  it("categoryId が null の支出も集計に含める", async () => {
    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: null, _sum: { amount: 5000 }, _count: { _all: 2 } },
    ] as never)
    mockCategoryFindMany.mockResolvedValue([] as never)

    const result = await aggregateByCategoryForMonth("2026-01")

    expect(result[0].categoryId).toBeNull()
    expect(result[0].categoryName).toBeNull()
    expect(result[0].amount).toBe(5000)
    expect(result[0].percentage).toBe(100.0)
  })
})

// ============================================================
// calcCoupleRatio
// ============================================================

describe("calcCoupleRatio", () => {
  it("夫婦の支出比率を計算する（visibility 無関係で全額集計）", async () => {
    mockExpenseGroupBy.mockResolvedValue([
      { userId: "user-taro", _sum: { amount: 150000 } },
      { userId: "user-hanako", _sum: { amount: 100000 } },
    ] as never)

    mockUserFindMany.mockResolvedValue([
      { id: "user-taro", name: "太郎" },
      { id: "user-hanako", name: "花子" },
    ] as never)

    const result = await calcCoupleRatio("2026-01", "user-taro")

    expect(result.user).toEqual({
      userId: "user-taro",
      name: "太郎",
      total: 150000,
      percentage: 60.0,
    })
    expect(result.partner).toEqual({
      userId: "user-hanako",
      name: "花子",
      total: 100000,
      percentage: 40.0,
    })
  })

  it("相手の支出がない場合は 0% を返す", async () => {
    mockExpenseGroupBy.mockResolvedValue([
      { userId: "user-taro", _sum: { amount: 100000 } },
    ] as never)

    mockUserFindMany.mockResolvedValue([
      { id: "user-taro", name: "太郎" },
    ] as never)

    const result = await calcCoupleRatio("2026-01", "user-taro")

    expect(result.user.percentage).toBe(100.0)
    expect(result.partner.total).toBe(0)
    expect(result.partner.percentage).toBe(0)
  })
})

// ============================================================
// aggregateMonthlyTrend
// ============================================================

describe("aggregateMonthlyTrend", () => {
  it("直近 N ヶ月の月次推移を昇順で返す", async () => {
    mockExpenseFindMany.mockResolvedValue([
      { date: new Date(2026, 0, 15), amount: 200000 },
      { date: new Date(2026, 0, 20), amount: 50000 },
      { date: new Date(2025, 11, 10), amount: 180000 },
    ] as never)

    const result = await aggregateMonthlyTrend(3, "2026-01")

    expect(result).toEqual([
      { yearMonth: "2025-11", total: 0 },
      { yearMonth: "2025-12", total: 180000 },
      { yearMonth: "2026-01", total: 250000 },
    ])
  })

  it("支出がない月は 0 を返す", async () => {
    mockExpenseFindMany.mockResolvedValue([] as never)

    const result = await aggregateMonthlyTrend(2, "2026-01")

    expect(result).toEqual([
      { yearMonth: "2025-12", total: 0 },
      { yearMonth: "2026-01", total: 0 },
    ])
  })

  it("months <= 0 の場合は空配列を返す", async () => {
    const result = await aggregateMonthlyTrend(0, "2026-01")
    expect(result).toEqual([])
    expect(mockExpenseFindMany).not.toHaveBeenCalled()
  })

  it("返金（負数）を含む月次集計が正しい", async () => {
    mockExpenseFindMany.mockResolvedValue([
      { date: new Date(2026, 0, 10), amount: 100000 },
      { date: new Date(2026, 0, 15), amount: -1200 },
    ] as never)

    const result = await aggregateMonthlyTrend(1, "2026-01")

    expect(result[0].total).toBe(98800)
  })
})

// ============================================================
// getBudgetSummary
// ============================================================

describe("getBudgetSummary", () => {
  it("予算 vs 実績を返す", async () => {
    mockBudgetFindMany.mockResolvedValue([
      { id: "b1", yearMonth: "2026-01", categoryId: null, amount: 300000, category: null },
      { id: "b2", yearMonth: "2026-01", categoryId: "cat-food", amount: 80000, category: { name: "食費" } },
    ] as never)

    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: "cat-food", _sum: { amount: 65000 } },
      { categoryId: "cat-transport", _sum: { amount: 30000 } },
    ] as never)

    const result = await getBudgetSummary("2026-01")

    expect(result.totalBudget).toBe(300000)
    expect(result.totalSpent).toBe(95000)
    expect(result.remainingBudget).toBe(205000)
    expect(result.budgetUsageRate).toBe(31.7)
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]).toEqual({
      categoryId: "cat-food",
      categoryName: "食費",
      budget: 80000,
      spent: 65000,
      remaining: 15000,
    })
  })

  it("全体予算がない場合はカテゴリ予算の合算を使う", async () => {
    mockBudgetFindMany.mockResolvedValue([
      { id: "b1", yearMonth: "2026-01", categoryId: "cat-food", amount: 80000, category: { name: "食費" } },
      { id: "b2", yearMonth: "2026-01", categoryId: "cat-transport", amount: 30000, category: { name: "交通費" } },
    ] as never)

    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: "cat-food", _sum: { amount: 40000 } },
    ] as never)

    const result = await getBudgetSummary("2026-01")

    expect(result.totalBudget).toBe(110000)
    expect(result.totalSpent).toBe(40000)
  })
})

// ============================================================
// getInstallmentSummary
// ============================================================

describe("getInstallmentSummary", () => {
  const baseInstallment = {
    id: "inst-1",
    userId: "user-taro",
    description: "ノートPC",
    totalAmount: 120000,
    monthlyAmount: 10000,
    totalMonths: 12,
    remainingMonths: 6,
    startDate: new Date("2025-07-01"),
    visibility: "PUBLIC" as const,
    fee: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: "user-taro" },
  }

  it("自分の分割払いは全フィールドを返す", async () => {
    mockInstallmentFindMany.mockResolvedValue([baseInstallment])

    const result = await getInstallmentSummary("user-taro")

    expect(result.activeCount).toBe(1)
    expect(result.totalMonthlyAmount).toBe(10000)
    expect(result.totalRemainingAmount).toBe(60000)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].description).toBe("ノートPC")
    expect(result.items[0].remainingAmount).toBe(60000)
    expect(result.items[0].progressRate).toBe(50.0)
  })

  it("相手の AMOUNT_ONLY は description をマスクする", async () => {
    mockInstallmentFindMany.mockResolvedValue([
      { ...baseInstallment, userId: "user-hanako", visibility: "AMOUNT_ONLY" as const },
    ])

    const result = await getInstallmentSummary("user-taro")

    expect(result.activeCount).toBe(1)
    expect(result.totalRemainingAmount).toBe(60000)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].description).toBe("個人支出")
  })

  it("相手の CATEGORY_TOTAL は items に含めず集計のみ反映", async () => {
    mockInstallmentFindMany.mockResolvedValue([
      { ...baseInstallment, userId: "user-hanako", visibility: "CATEGORY_TOTAL" as const },
    ])

    const result = await getInstallmentSummary("user-taro")

    expect(result.activeCount).toBe(1)
    expect(result.totalMonthlyAmount).toBe(10000)
    expect(result.totalRemainingAmount).toBe(60000)
    expect(result.items).toHaveLength(0)
  })
})

// ============================================================
// getCsvImportStatus
// ============================================================

describe("getCsvImportStatus", () => {
  it("取り込みステータスを返す", async () => {
    const importDate = new Date("2026-01-15")
    mockCsvImportFindFirst.mockResolvedValue({ importedAt: importDate } as never)
    mockExpenseCount.mockResolvedValue(5)
    // CARD_OWNERS: epos(user_wife), mufg_jcb(user_husband), mufg_visa(user_husband)
    mockCsvImportFindMany.mockResolvedValue([
      { userId: "user_wife", cardType: "epos" },
      { userId: "user_husband", cardType: "mufg_jcb" },
      { userId: "user_husband", cardType: "mufg_visa" },
    ] as never)

    const result = await getCsvImportStatus("2026-01")

    expect(result.lastImportDate).toEqual(importDate)
    expect(result.pendingConfirmCount).toBe(5)
    expect(result.unimportedMonths).toEqual([])
  })

  it("一部のカードが未取り込みなら unimportedMonths に含める", async () => {
    mockCsvImportFindFirst.mockResolvedValue(null)
    mockExpenseCount.mockResolvedValue(0)
    // epos のみ取り込み済み（mufg_jcb, mufg_visa が不足）
    mockCsvImportFindMany.mockResolvedValue([
      { userId: "user_wife", cardType: "epos" },
    ] as never)

    const result = await getCsvImportStatus("2026-02")

    expect(result.unimportedMonths).toContain("2026-02")
  })

  it("取り込みがゼロの月は unimportedMonths に含める", async () => {
    mockCsvImportFindFirst.mockResolvedValue(null)
    mockExpenseCount.mockResolvedValue(0)
    mockCsvImportFindMany.mockResolvedValue([])

    const result = await getCsvImportStatus("2026-02")

    expect(result.unimportedMonths).toContain("2026-02")
  })
})

// ============================================================
// aggregateCategoryTrend
// ============================================================

describe("aggregateCategoryTrend", () => {
  it("上位カテゴリ別の月次推移を昇順で返す", async () => {
    // Stage 1: groupBy
    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: "cat-food", _sum: { amount: 120000 } },
      { categoryId: "cat-transport", _sum: { amount: 80000 } },
    ] as never)

    // カテゴリ名取得
    mockCategoryFindMany.mockResolvedValue([
      { id: "cat-food", name: "食費" },
      { id: "cat-transport", name: "交通費" },
    ] as never)

    // Stage 2: findMany
    mockExpenseFindMany.mockResolvedValue([
      { date: new Date(2026, 0, 10), amount: 60000, categoryId: "cat-food" },
      { date: new Date(2026, 0, 20), amount: 40000, categoryId: "cat-transport" },
      { date: new Date(2025, 11, 5), amount: 60000, categoryId: "cat-food" },
      { date: new Date(2025, 11, 15), amount: 40000, categoryId: "cat-transport" },
    ] as never)

    const result = await aggregateCategoryTrend(2, "2026-01", 5)

    expect(result).toHaveLength(2)
    // 昇順（古い月→新しい月）
    expect(result[0].yearMonth).toBe("2025-12")
    expect(result[1].yearMonth).toBe("2026-01")
    // カテゴリ別金額
    expect(result[1].categories).toEqual([
      { categoryId: "cat-food", categoryName: "食費", amount: 60000 },
      { categoryId: "cat-transport", categoryName: "交通費", amount: 40000 },
    ])
  })

  it("未分類カテゴリ（categoryId = null）もTOP Nに含める", async () => {
    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: null, _sum: { amount: 100000 } },
      { categoryId: "cat-food", _sum: { amount: 50000 } },
    ] as never)

    mockCategoryFindMany.mockResolvedValue([
      { id: "cat-food", name: "食費" },
    ] as never)

    mockExpenseFindMany.mockResolvedValue([
      { date: new Date(2026, 0, 10), amount: 100000, categoryId: null },
      { date: new Date(2026, 0, 20), amount: 50000, categoryId: "cat-food" },
    ] as never)

    const result = await aggregateCategoryTrend(1, "2026-01", 5)

    expect(result).toHaveLength(1)
    expect(result[0].categories).toHaveLength(2)
    // 未分類が1位
    expect(result[0].categories[0]).toEqual({
      categoryId: "__uncategorized__",
      categoryName: "未分類",
      amount: 100000,
    })
    expect(result[0].categories[1]).toEqual({
      categoryId: "cat-food",
      categoryName: "食費",
      amount: 50000,
    })

    // Stage2のfindManyがOR条件でnullカテゴリも取得していることを検証（再発防止）
    const findManyCall = mockExpenseFindMany.mock.calls[0][0] as { where: Record<string, unknown> }
    expect(findManyCall.where).toHaveProperty("OR")
    const orConditions = findManyCall.where.OR as Array<Record<string, unknown>>
    expect(orConditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryId: { in: ["cat-food"] } }),
        expect.objectContaining({ categoryId: null }),
      ]),
    )
  })

  it("months <= 0 の場合は空配列を返す", async () => {
    const result = await aggregateCategoryTrend(0, "2026-01")
    expect(result).toEqual([])
    expect(mockExpenseGroupBy).not.toHaveBeenCalled()
  })

  it("groupBy が空の場合は空配列を返す", async () => {
    mockExpenseGroupBy.mockResolvedValue([] as never)

    const result = await aggregateCategoryTrend(2, "2026-01", 5)
    expect(result).toEqual([])
  })

  it("データがない月は金額 0 を返す", async () => {
    mockExpenseGroupBy.mockResolvedValue([
      { categoryId: "cat-food", _sum: { amount: 60000 } },
    ] as never)

    mockCategoryFindMany.mockResolvedValue([
      { id: "cat-food", name: "食費" },
    ] as never)

    // 2026-01のデータのみ、2025-12はなし
    mockExpenseFindMany.mockResolvedValue([
      { date: new Date(2026, 0, 10), amount: 60000, categoryId: "cat-food" },
    ] as never)

    const result = await aggregateCategoryTrend(2, "2026-01", 5)

    expect(result[0].yearMonth).toBe("2025-12")
    expect(result[0].categories[0].amount).toBe(0)
    expect(result[1].yearMonth).toBe("2026-01")
    expect(result[1].categories[0].amount).toBe(60000)
  })
})
