import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/dashboard", () => ({
  getDashboardSummary: vi.fn(),
}))

import { getDashboardSummary } from "@/lib/dashboard"
import { buildChatContext } from "./build-chat-context"

const mockGetSummary = vi.mocked(getDashboardSummary)

function createMockSummary() {
  return {
    yearMonth: "2026-02",
    monthly: { yearMonth: "2026-02", totalAmount: 150000, count: 30 },
    categories: [
      {
        categoryId: "cat1",
        categoryName: "食費",
        categoryIcon: "🍚",
        amount: 50000,
        percentage: 33.3,
        count: 15,
      },
      {
        categoryId: "cat2",
        categoryName: "交通費",
        categoryIcon: "🚃",
        amount: 30000,
        percentage: 20,
        count: 10,
      },
    ],
    coupleRatio: {
      user: { userId: "u1", name: "太郎", total: 90000, percentage: 60 },
      partner: { userId: "u2", name: "花子", total: 60000, percentage: 40 },
    },
    trend: [
      { yearMonth: "2025-12", total: 130000 },
      { yearMonth: "2026-01", total: 140000 },
      { yearMonth: "2026-02", total: 150000 },
    ],
    budget: {
      totalBudget: 200000,
      totalSpent: 150000,
      remainingBudget: 50000,
      budgetUsageRate: 75,
      categories: [
        {
          categoryId: "cat1",
          categoryName: "食費",
          budget: 60000,
          spent: 50000,
          remaining: 10000,
        },
      ],
    },
    installment: {
      activeCount: 1,
      totalMonthlyAmount: 10000,
      totalRemainingAmount: 50000,
      items: [],
    },
    csvImport: {
      lastImportDate: null,
      pendingConfirmCount: 0,
      unimportedMonths: [],
    },
    monthlyComparison: {
      current: 150000,
      previous: 140000,
      diff: 10000,
      ratio: 7.1,
    },
  }
}

describe("buildChatContext", () => {
  it("月次概要を含むコンテキストを生成する", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    const context = await buildChatContext("u1", "2026-02")

    expect(context).toContain("2026-02の家計概要")
    expect(context).toContain("150,000")
    expect(context).toContain("30件")
    expect(context).toContain("+7.1%")
  })

  it("カテゴリ別情報を含む", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    const context = await buildChatContext("u1", "2026-02")

    expect(context).toContain("食費")
    expect(context).toContain("50,000")
    expect(context).toContain("33.3%")
    expect(context).toContain("交通費")
  })

  it("予算状況を含む", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    const context = await buildChatContext("u1", "2026-02")

    expect(context).toContain("予算状況")
    expect(context).toContain("60,000")
    expect(context).toContain("75%")
  })

  it("夫婦負担割合を含む（個人名は送信しない）", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    const context = await buildChatContext("u1", "2026-02")

    expect(context).toContain("あなた: 60%")
    expect(context).toContain("パートナー: 40%")
    // 個人名がAIに送信されていないことを確認
    expect(context).not.toContain("太郎")
    expect(context).not.toContain("花子")
  })

  it("分割払い情報を含む", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    const context = await buildChatContext("u1", "2026-02")

    expect(context).toContain("分割払い")
    expect(context).toContain("10,000")
  })

  it("明細情報（description, memo）がコンテキストに含まれない", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    const context = await buildChatContext("u1", "2026-02")

    expect(context).not.toContain("description")
    expect(context).not.toContain("memo")
    expect(context).not.toContain("expenseId")
  })

  it("予算0のカテゴリは予算状況に含めない", async () => {
    const summary = createMockSummary()
    summary.budget.categories = [
      {
        categoryId: "cat1",
        categoryName: "食費",
        budget: 0,
        spent: 50000,
        remaining: -50000,
      },
    ]
    mockGetSummary.mockResolvedValue(summary)

    const context = await buildChatContext("u1", "2026-02")

    // budget:0 のカテゴリは予算セクションに含めない（"50,000/0"のようなパターンがない）
    expect(context).not.toMatch(/食費:.*50,000.*\/.*0/)
  })

  it("getDashboardSummaryにmonths:3を渡す", async () => {
    mockGetSummary.mockResolvedValue(createMockSummary())

    await buildChatContext("u1", "2026-02")

    expect(mockGetSummary).toHaveBeenCalledWith({
      yearMonth: "2026-02",
      months: 3,
      userId: "u1",
    })
  })
})
