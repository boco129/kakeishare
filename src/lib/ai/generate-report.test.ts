import { describe, expect, it, vi, beforeEach } from "vitest"

// モック設定
vi.mock("./client", () => ({
  getAnthropicClientSingleton: vi.fn(),
  AI_MODELS: { REPORT: "claude-sonnet-4-6" },
}))

vi.mock("./usage-logger", () => ({
  logTokenUsage: vi.fn(() => ({
    action: "monthly-report",
    inputTokens: 500,
    outputTokens: 200,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    totalTokens: 700,
    timestamp: "2026-01-01T00:00:00.000Z",
  })),
}))

vi.mock("@/lib/env-schema", () => ({
  validateEnv: () => ({
    DATABASE_URL: "file:./prisma/test.db",
    AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
    ANTHROPIC_API_KEY: "sk-test-key",
  }),
}))

import { getAnthropicClientSingleton } from "./client"
import { toAIReportInput, generateMonthlyReport } from "./generate-report"
import type { DashboardSummary } from "@/lib/dashboard"

const mockGetClient = vi.mocked(getAnthropicClientSingleton)

function createMockSummary(): DashboardSummary {
  return {
    yearMonth: "2026-01",
    monthly: { yearMonth: "2026-01", totalAmount: 150000, count: 30 },
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
      { yearMonth: "2025-12", total: 140000 },
      { yearMonth: "2026-01", total: 150000 },
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
      activeCount: 0,
      totalMonthlyAmount: 0,
      totalRemainingAmount: 0,
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
    categoryTrend: [],
  } as unknown as DashboardSummary
}

describe("toAIReportInput", () => {
  it("DashboardSummary を AIReportInput に正しく変換する", () => {
    const summary = createMockSummary()
    const input = toAIReportInput(summary)

    expect(input.yearMonth).toBe("2026-01")
    expect(input.summary.totalAmount).toBe(150000)
    expect(input.summary.categoryBreakdown).toHaveLength(2)
    expect(input.summary.categoryBreakdown[0]).toEqual({
      category: "食費",
      amount: 50000,
      count: 15,
    })
    expect(input.summary.coupleRatio).toEqual({ user1: 60, user2: 40 })
    expect(input.summary.budgetSummary).toHaveLength(1)
    expect(input.summary.budgetSummary[0]).toEqual({
      category: "食費",
      budget: 60000,
      actual: 50000,
    })
  })

  it("明細情報（description, memo）がAIに渡されないことを確認", () => {
    const summary = createMockSummary()
    const input = toAIReportInput(summary)

    // AIReportInput のトップレベルキーを厳密チェック
    expect(Object.keys(input).sort()).toEqual(["summary", "yearMonth"])

    // summary 内部キーを厳密チェック
    const summaryKeys = Object.keys(input.summary).sort()
    expect(summaryKeys).toEqual(["budgetSummary", "categoryBreakdown", "coupleRatio", "totalAmount"])

    // 明細レベルの情報が含まれないことを確認
    const json = JSON.stringify(input)
    expect(json).not.toContain("description")
    expect(json).not.toContain("memo")
    expect(json).not.toContain("expenseId")
  })

  it("予算未設定のカテゴリは budgetSummary に含めない", () => {
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
    const input = toAIReportInput(summary)
    expect(input.summary.budgetSummary).toHaveLength(0)
  })
})

describe("generateMonthlyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockEnv = {
    DATABASE_URL: "file:./prisma/test.db",
    AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
    ANTHROPIC_API_KEY: "sk-test-key",
  }

  it("正常にレポートを生成する", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: "## 2026年1月の家計レビュー\n\n今月の支出合計は150,000円でした。食費が最も多く50,000円を占めています。",
        },
      ],
      usage: {
        input_tokens: 500,
        output_tokens: 200,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIReportInput(createMockSummary())
    const result = await generateMonthlyReport(input, mockEnv as never)

    expect(result.report).toContain("2026年1月の家計レビュー")
    expect(result.tokenUsage).toEqual({ inputTokens: 500, outputTokens: 200 })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
      }),
    )
  })

  it("レスポンスが短すぎる場合はエラーをthrowする", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "短い" }],
      usage: { input_tokens: 100, output_tokens: 5 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIReportInput(createMockSummary())
    await expect(generateMonthlyReport(input, mockEnv as never)).rejects.toThrow(
      "レスポンスが短すぎます",
    )
  })

  it("テキストブロックがない場合はエラーをthrowする", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [],
      usage: { input_tokens: 100, output_tokens: 0 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIReportInput(createMockSummary())
    await expect(generateMonthlyReport(input, mockEnv as never)).rejects.toThrow(
      "レスポンスが短すぎます",
    )
  })
})
