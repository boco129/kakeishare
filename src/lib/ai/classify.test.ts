import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Env } from "@/lib/env-schema"

// モック設定
vi.mock("./client", () => ({
  getAnthropicClientSingleton: vi.fn(),
  AI_MODELS: { CLASSIFICATION: "claude-haiku-4-5", REPORT: "claude-sonnet-4-6" },
}))

vi.mock("./usage-logger", () => ({
  logTokenUsage: vi.fn(),
}))

vi.mock("@/lib/expenses", () => ({
  resolveVisibilityBatch: vi.fn(),
}))

import { getAnthropicClientSingleton } from "./client"
import { resolveVisibilityBatch } from "@/lib/expenses"
import { classifyExpenses } from "./classify"
import type { CategoryForResolver } from "./category-resolver"
import { Visibility } from "@/generated/prisma/enums"

const mockGetClient = vi.mocked(getAnthropicClientSingleton)
const mockResolveVisibilityBatch = vi.mocked(resolveVisibilityBatch)

const TEST_ENV: Env = {
  DATABASE_URL: "file:./prisma/test.db",
  AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
  ANTHROPIC_API_KEY: "sk-test-key",
}

const CATEGORIES: CategoryForResolver[] = [
  { id: "cat_food", name: "食費", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_daily", name: "日用品", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_social", name: "交際費", defaultVisibility: Visibility.AMOUNT_ONLY },
  { id: "cat_other", name: "その他", defaultVisibility: Visibility.AMOUNT_ONLY },
]

function mockApiResponse(content: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(content) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  }
}

describe("classifyExpenses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトのvisibility解決
    mockResolveVisibilityBatch.mockResolvedValue(
      new Map([
        ["cat_food", Visibility.PUBLIC],
        ["cat_social", Visibility.AMOUNT_ONLY],
        ["cat_other", Visibility.AMOUNT_ONLY],
      ]),
    )
  })

  it("正常に分類結果を返す", async () => {
    const apiResponse = [
      { category: "食費", confidence: "high", reasoning: "スーパーマーケット" },
      { category: "交際費", confidence: "medium", reasoning: "飲食店" },
    ]
    mockGetClient.mockReturnValue(mockApiResponse(apiResponse) as never)

    const inputs = [
      { description: "イオン", amount: 3000, date: "2026-01-15" },
      { description: "居酒屋ABC", amount: 5000, date: "2026-01-16" },
    ]
    const expenseIds = ["exp1", "exp2"]

    const results = await classifyExpenses(TEST_ENV, inputs, expenseIds, CATEGORIES, "user1")

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      expenseId: "exp1",
      categoryId: "cat_food",
      confidence: "high",
      suggestedVisibility: Visibility.PUBLIC,
      confirmed: true,
    })
    expect(results[1]).toMatchObject({
      expenseId: "exp2",
      categoryId: "cat_social",
      confidence: "medium",
      suggestedVisibility: Visibility.AMOUNT_ONLY,
      confirmed: true,
    })
  })

  it("confidence: low の場合 confirmed: false になる", async () => {
    const apiResponse = [
      { category: "その他", confidence: "low", reasoning: "不明な店舗" },
    ]
    mockGetClient.mockReturnValue(mockApiResponse(apiResponse) as never)

    const results = await classifyExpenses(
      TEST_ENV,
      [{ description: "???", amount: 1000, date: "2026-01-15" }],
      ["exp1"],
      CATEGORIES,
      "user1",
    )

    expect(results[0].confirmed).toBe(false)
    expect(results[0].confidence).toBe("low")
  })

  it("空の入力配列では空の結果を返す", async () => {
    const results = await classifyExpenses(TEST_ENV, [], [], CATEGORIES, "user1")
    expect(results).toEqual([])
  })

  it("inputs と expenseIds の件数不一致でエラーを投げる", async () => {
    await expect(
      classifyExpenses(
        TEST_ENV,
        [{ description: "test", amount: 100, date: "2026-01-01" }],
        ["id1", "id2"],
        CATEGORIES,
        "user1",
      ),
    ).rejects.toThrow("件数が一致しません")
  })

  it("API呼び出しエラー時はフォールバック結果を返す", async () => {
    mockGetClient.mockReturnValue({
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API Error")),
      },
    } as never)

    const results = await classifyExpenses(
      TEST_ENV,
      [{ description: "test", amount: 100, date: "2026-01-01" }],
      ["exp1"],
      CATEGORIES,
      "user1",
    )

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      expenseId: "exp1",
      categoryId: "cat_other",
      confidence: "low",
      confirmed: false,
    })
  })

  it("JSONパースエラー時はフォールバック結果を返す", async () => {
    mockGetClient.mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "invalid json" }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    } as never)

    const results = await classifyExpenses(
      TEST_ENV,
      [{ description: "test", amount: 100, date: "2026-01-01" }],
      ["exp1"],
      CATEGORIES,
      "user1",
    )

    expect(results[0].categoryId).toBe("cat_other")
    expect(results[0].confidence).toBe("low")
    expect(results[0].confirmed).toBe(false)
  })

  it("入出力件数不一致時はフォールバック結果を返す", async () => {
    // APIが1件しか返さないのに入力は2件
    const apiResponse = [{ category: "食費", confidence: "high" }]
    mockGetClient.mockReturnValue(mockApiResponse(apiResponse) as never)

    const results = await classifyExpenses(
      TEST_ENV,
      [
        { description: "A", amount: 100, date: "2026-01-01" },
        { description: "B", amount: 200, date: "2026-01-02" },
      ],
      ["exp1", "exp2"],
      CATEGORIES,
      "user1",
    )

    expect(results).toHaveLength(2)
    expect(results[0].categoryId).toBe("cat_other")
    expect(results[1].categoryId).toBe("cat_other")
  })

  it("100件を超える入力はチャンク分割される", async () => {
    const createFn = vi.fn()
    // 各チャンクに対して正しい件数の結果を返す
    createFn.mockImplementation(async (opts: { messages: { content: string }[] }) => {
      const parsed = JSON.parse(opts.messages[0].content) as unknown[]
      const items = parsed.map(() => ({ category: "食費", confidence: "high" }))
      return {
        content: [{ type: "text", text: JSON.stringify(items) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }
    })
    mockGetClient.mockReturnValue({ messages: { create: createFn } } as never)

    const count = 150
    const inputs = Array.from({ length: count }, (_, i) => ({
      description: `店舗${i}`,
      amount: 1000,
      date: "2026-01-15",
    }))
    const expenseIds = Array.from({ length: count }, (_, i) => `exp${i}`)

    const results = await classifyExpenses(TEST_ENV, inputs, expenseIds, CATEGORIES, "user1")

    expect(results).toHaveLength(150)
    // 2回のAPI呼び出し（100 + 50）
    expect(createFn).toHaveBeenCalledTimes(2)
  })

  it("resolveVisibilityBatch を使用してvisibilityを解決する", async () => {
    const apiResponse = [{ category: "食費", confidence: "high" }]
    mockGetClient.mockReturnValue(mockApiResponse(apiResponse) as never)

    await classifyExpenses(
      TEST_ENV,
      [{ description: "テスト", amount: 1000, date: "2026-01-01" }],
      ["exp1"],
      CATEGORIES,
      "user1",
    )

    expect(mockResolveVisibilityBatch).toHaveBeenCalledWith("user1", ["cat_food"])
  })
})
