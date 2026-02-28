import { describe, expect, it, vi, beforeEach } from "vitest"

// モック設定
vi.mock("./client", () => ({
  getAnthropicClientSingleton: vi.fn(),
  AI_MODELS: { REPORT: "claude-sonnet-4-6" },
}))

vi.mock("./usage-logger", () => ({
  logTokenUsage: vi.fn(() => ({
    action: "insights",
    inputTokens: 800,
    outputTokens: 500,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    totalTokens: 1300,
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
import { toAIInsightsInput, generateInsights } from "./generate-insights"
import type { ReviewSummary } from "@/lib/dashboard"

const mockGetClient = vi.mocked(getAnthropicClientSingleton)

function createMockReviewSummary(): ReviewSummary {
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
      { yearMonth: "2025-08", total: 120000 },
      { yearMonth: "2025-09", total: 130000 },
      { yearMonth: "2025-10", total: 125000 },
      { yearMonth: "2025-11", total: 135000 },
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
      activeCount: 1,
      totalMonthlyAmount: 10000,
      totalRemainingAmount: 50000,
      items: [
        {
          id: "inst1",
          description: "家電",
          totalAmount: 60000,
          monthlyAmount: 10000,
          remainingMonths: 5,
          remainingAmount: 50000,
          progressRate: 16.7,
          visibility: "PUBLIC" as const,
        },
      ],
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
    categoryTrend: [
      {
        yearMonth: "2025-12",
        categories: [
          { categoryId: "cat1", categoryName: "食費", amount: 45000 },
          { categoryId: "cat2", categoryName: "交通費", amount: 28000 },
        ],
      },
      {
        yearMonth: "2026-01",
        categories: [
          { categoryId: "cat1", categoryName: "食費", amount: 50000 },
          { categoryId: "cat2", categoryName: "交通費", amount: 30000 },
        ],
      },
    ],
  } as unknown as ReviewSummary
}

const mockFixedCostMap = new Map<string, boolean>([
  ["cat1", false],
  ["cat2", true],
])

const validInsightsJson = {
  suggestions: [
    {
      category: "食費",
      currentAverage: 47500,
      targetAmount: 40000,
      savingAmount: 7500,
      description: "食費が直近6ヶ月で平均47,500円。まとめ買いや献立計画で月40,000円に抑えられます。",
      priority: "high" as const,
    },
  ],
  forecast: {
    totalPredicted: 155000,
    confidence: "high" as const,
    confidenceReason: "6ヶ月分のデータがあり、安定した傾向が見られます",
    categories: [
      {
        category: "食費",
        predictedAmount: 52000,
        reason: "増加傾向（前月比+11%）",
      },
      {
        category: "交通費",
        predictedAmount: 31000,
        reason: "安定推移",
      },
    ],
  },
  summary:
    "全体的に支出は増加傾向にあります。食費の見直しで月7,500円の削減が期待できます。来月の予測総額は155,000円です。",
}

describe("toAIInsightsInput", () => {
  it("ReviewSummary を AIInsightsInput に正しく変換する", () => {
    const summary = createMockReviewSummary()
    const input = toAIInsightsInput(summary, mockFixedCostMap)

    expect(input.yearMonth).toBe("2026-01")
    expect(input.availableMonths).toBe(6)
    expect(input.monthlyTrend).toHaveLength(6)
    expect(input.categoryTrend).toHaveLength(2)
    expect(input.budgetSummary).toHaveLength(1)
    expect(input.installments).toHaveLength(1)
  })

  it("isFixedCostが正しく解決される", () => {
    const summary = createMockReviewSummary()
    const input = toAIInsightsInput(summary, mockFixedCostMap)

    const janCategories = input.categoryTrend[1].categories
    const food = janCategories.find((c) => c.category === "食費")
    const transport = janCategories.find((c) => c.category === "交通費")
    expect(food?.isFixedCost).toBe(false)
    expect(transport?.isFixedCost).toBe(true)
  })

  it("明細情報（description, memo）がAIに渡されないことを確認", () => {
    const summary = createMockReviewSummary()
    const input = toAIInsightsInput(summary, mockFixedCostMap)

    // トップレベルキーを厳密チェック
    expect(Object.keys(input).sort()).toEqual([
      "availableMonths",
      "budgetSummary",
      "categoryTrend",
      "installments",
      "monthlyTrend",
      "yearMonth",
    ])

    // 明細レベルの情報が含まれないことを確認
    const json = JSON.stringify(input)
    expect(json).not.toContain("description")
    expect(json).not.toContain("memo")
    expect(json).not.toContain("expenseId")
  })

  it("予算未設定のカテゴリは budgetSummary に含めない", () => {
    const summary = createMockReviewSummary()
    summary.budget.categories = [
      {
        categoryId: "cat1",
        categoryName: "食費",
        budget: 0,
        spent: 50000,
        remaining: -50000,
      },
    ]
    const input = toAIInsightsInput(summary, mockFixedCostMap)
    expect(input.budgetSummary).toHaveLength(0)
  })

  it("availableMonthsはtrend配列の長さと一致する", () => {
    const summary = createMockReviewSummary()
    summary.trend = [
      { yearMonth: "2025-10", total: 0 },
      { yearMonth: "2025-11", total: 0 },
      { yearMonth: "2025-12", total: 140000 },
      { yearMonth: "2026-01", total: 150000 },
    ]
    const input = toAIInsightsInput(summary, mockFixedCostMap)
    expect(input.availableMonths).toBe(4)
  })
})

describe("generateInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockEnv = {
    DATABASE_URL: "file:./prisma/test.db",
    AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
    ANTHROPIC_API_KEY: "sk-test-key",
  }

  it("正常にインサイトを生成する", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify(validInsightsJson),
        },
      ],
      usage: {
        input_tokens: 800,
        output_tokens: 500,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const summary = createMockReviewSummary()
    const input = toAIInsightsInput(summary, mockFixedCostMap)
    const result = await generateInsights(input, mockEnv as never)

    expect(result.insights.suggestions).toHaveLength(1)
    expect(result.insights.suggestions[0].category).toBe("食費")
    expect(result.insights.forecast.totalPredicted).toBe(155000)
    expect(result.insights.forecast.confidence).toBe("high")
    expect(result.insights.summary).toContain("食費")
    expect(result.tokenUsage).toEqual({ inputTokens: 800, outputTokens: 500 })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
      }),
    )
  })

  it("```json付きコードブロック応答をパースできる", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: "```json\n" + JSON.stringify(validInsightsJson) + "\n```",
        },
      ],
      usage: { input_tokens: 800, output_tokens: 500 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIInsightsInput(createMockReviewSummary(), mockFixedCostMap)
    const result = await generateInsights(input, mockEnv as never)
    expect(result.insights.suggestions).toHaveLength(1)
  })

  it("```（言語指定なし）コードブロック応答もパースできる", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: "```\n" + JSON.stringify(validInsightsJson) + "\n```",
        },
      ],
      usage: { input_tokens: 800, output_tokens: 500 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIInsightsInput(createMockReviewSummary(), mockFixedCostMap)
    const result = await generateInsights(input, mockEnv as never)
    expect(result.insights.suggestions).toHaveLength(1)
  })

  it("不正なJSONの場合はエラーをthrowする", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "これはJSONではありません" }],
      usage: { input_tokens: 100, output_tokens: 20 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIInsightsInput(createMockReviewSummary(), mockFixedCostMap)
    await expect(generateInsights(input, mockEnv as never)).rejects.toThrow(
      "JSONパースエラー",
    )
  })

  it("Zodバリデーション失敗の場合はエラーをthrowする", async () => {
    const invalidJson = { ...validInsightsJson, summary: "" }
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(invalidJson) }],
      usage: { input_tokens: 800, output_tokens: 500 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIInsightsInput(createMockReviewSummary(), mockFixedCostMap)
    await expect(generateInsights(input, mockEnv as never)).rejects.toThrow(
      "出力検証エラー",
    )
  })

  it("テキストブロックがない場合はエラーをthrowする", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [],
      usage: { input_tokens: 100, output_tokens: 0 },
    })
    mockGetClient.mockReturnValue({ messages: { create: mockCreate } } as never)

    const input = toAIInsightsInput(createMockReviewSummary(), mockFixedCostMap)
    await expect(generateInsights(input, mockEnv as never)).rejects.toThrow(
      "JSONパースエラー",
    )
  })
})
